/**
 * @version 0.20
 */
import BlocksoftAxios from '../../common/BlocksoftAxios'
import BlocksoftCryptoLog from '../../common/BlocksoftCryptoLog'
import BlocksoftUtils from '../../common/BlocksoftUtils'

import TronUtils from './ext/TronUtils'

import TrxTronscanProvider from './basic/TrxTronscanProvider'
import TrxTrongridProvider from './basic/TrxTrongridProvider'
import { BlocksoftBlockchainTypes } from '../BlocksoftBlockchainTypes'

export default class TrxTransferProcessor implements BlocksoftBlockchainTypes.TransferProcessor {
    private _settings: any
    private _tronNodePath: string
    private _tronscanProvider: TrxTronscanProvider
    private _trongridProvider: TrxTrongridProvider
    private _tokenName: string

    constructor(settings: any) {
        this._settings = settings
        this._tronNodePath = 'https://api.trongrid.io'
        this._tronscanProvider = new TrxTronscanProvider()
        this._trongridProvider = new TrxTrongridProvider()
        this._tokenName = '_'
        if (typeof settings.tokenName !== 'undefined') {
            this._tokenName = settings.tokenName
        }
    }

    needPrivateForFee(): boolean {
        return false
    }

    checkSendAllModal(data: { currencyCode: any }): boolean {
        return false
    }

    async getFeeRate(data: BlocksoftBlockchainTypes.TransferData, privateData: BlocksoftBlockchainTypes.TransferPrivateData, additionalData: {} = {}): Promise<BlocksoftBlockchainTypes.FeeRateResult> {
        const result: BlocksoftBlockchainTypes.FeeRateResult = {
            selectedFeeIndex: -1
        } as BlocksoftBlockchainTypes.FeeRateResult
        if (data.addressTo && data.addressTo === data.addressFrom) {
            return result
        }
        try {
            const res = await BlocksoftAxios.getWithoutBraking('https://apilist.tronscan.org/api/account?address=' + data.addressTo)
            // @ts-ignore
            if (res.data.bandwidth.freeNetRemaining.toString() === '0') {
                result.fees = [
                    {
                        langMsg: 'xrp_speed_one',
                        feeForTx: '100000',
                        amountForTx: data.amount
                    }
                ]
                result.selectedFeeIndex = 0
            }
        } catch (e) {
            // do nothing
        }
        return result
    }

    async getTransferAllBalance(data: BlocksoftBlockchainTypes.TransferData, privateData: BlocksoftBlockchainTypes.TransferPrivateData, additionalData: { estimatedGas?: number, gasPrice?: number[], balance?: string } = {}): Promise<BlocksoftBlockchainTypes.TransferAllBalanceResult> {
        const balance = data.amount
        // @ts-ignore
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' TrxTransferProcessor.getTransferAllBalance ', data.addressFrom + ' => ' + balance)
        // noinspection EqualityComparisonWithCoercionJS
        if (balance === '0') {
            return {
                selectedTransferAllBalance: '0',
                selectedFeeIndex: -1,
                fees: [],
                countedForBasicBalance: '0'
            }
        }
        const fees = await this.getFeeRate(data, privateData, additionalData)
        if (!fees || fees.selectedFeeIndex < 0) {
            return {
                selectedTransferAllBalance: balance,
                selectedFeeIndex: -2,
                fees: [],
                countedForBasicBalance: balance
            }
        }
        return {
            ...fees,
            selectedTransferAllBalance: fees.fees[fees.selectedFeeIndex].amountForTx,
            shouldChangeBalance: false
        }
    }

    /**
     * https://developers.tron.network/reference#walletcreatetransaction
     * https://developers.tron.network/docs/trc20-introduction#section-8usdt-transfer
     */
    async sendTx(data: BlocksoftBlockchainTypes.TransferData, privateData: BlocksoftBlockchainTypes.TransferPrivateData, uiData: BlocksoftBlockchainTypes.TransferUiData): Promise<BlocksoftBlockchainTypes.SendTxResult> {
        if (typeof privateData.privateKey === 'undefined') {
            throw new Error('TRX transaction required privateKey')
        }
        if (typeof data.addressTo === 'undefined') {
            throw new Error('TRX transaction required addressTo')
        }
        if (data.addressFrom === data.addressTo) {
            throw new Error('SERVER_RESPONSE_SELF_TX_FORBIDDEN')
        }

        BlocksoftCryptoLog.log(this._settings.currencyCode + ' TrxTxProcessor.sendTx started')

        let tx
        if (typeof data.blockchainData !== 'undefined' && data.blockchainData) {
            tx = data.blockchainData
        } else {
            let toAddress, ownerAddress

            try {
                toAddress = TronUtils.addressToHex(data.addressTo)
            } catch (e) {
                e.message += ' inside TronUtils.addressToHex to_address ' + data.addressTo
                throw e
            }

            try {
                ownerAddress = TronUtils.addressToHex(data.addressFrom)
            } catch (e) {
                e.message += ' inside TronUtils.addressToHex owner_address ' + data.addressFrom
                throw e
            }


            let link, res, params
            if (this._tokenName[0] === 'T') {
                link = this._tronNodePath + '/wallet/triggersmartcontract'
                params = {
                    owner_address: ownerAddress,
                    contract_address: TronUtils.addressToHex(this._tokenName),
                    function_selector: 'transfer(address,uint256)',
                    // @ts-ignore
                    parameter: '0000000000000000000000' + toAddress.toUpperCase() + '00000000000000000000000000000000000000000000' + BlocksoftUtils.decimalToHex(data.amount * 1, 20),
                    fee_limit: 100000000,
                    call_value: 0
                }
                res = await BlocksoftAxios.post(link, params)
            } else {
                params = {
                    owner_address: ownerAddress,
                    to_address: toAddress,
                    // @ts-ignore
                    amount: data.amount * 1
                }

                if (this._tokenName === '_') {
                    link = this._tronNodePath + '/wallet/createtransaction'
                } else {
                    // @ts-ignore
                    params.asset_name = '0x' + Buffer.from(this._tokenName).toString('hex')
                    link = this._tronNodePath + '/wallet/transferasset'
                }
                res = await BlocksoftAxios.post(link, params)
            }

            // @ts-ignore
            if (typeof res.data.Error !== 'undefined') {
                // @ts-ignore
                this.checkError(res.data.Error.message || res.data.Error)
            }

            // @ts-ignore
            tx = res.data
            if (this._tokenName[0] === 'T') {
                // @ts-ignore
                if (typeof res.data.transaction === 'undefined' || typeof res.data.result === 'undefined') {
                    // @ts-ignore
                    if (typeof res.data.result.message !== 'undefined') {
                        // @ts-ignore
                        res.data.result.message = BlocksoftUtils.hexToUtf('0x' + res.data.result.message)
                    }
                    // @ts-ignore
                    this.checkError('No tx in contract data ' + JSON.stringify(res.data))
                }
                // @ts-ignore
                tx = res.data.transaction
            } else {
                // @ts-ignore
                if (typeof res.data.txID === 'undefined') {
                    // @ts-ignore
                    if (typeof res.data.result.message !== 'undefined') {
                        // @ts-ignore
                        res.data.result.message = BlocksoftUtils.hexToUtf('0x' + res.data.result.message)
                    }
                    // @ts-ignore
                    this.checkError('No txID in data ' + JSON.stringify(res.data))
                }
            }
        }

        BlocksoftCryptoLog.log(this._settings.currencyCode + ' TrxTxProcessor.sendTx tx', tx)

        tx.signature = [TronUtils.ECKeySign(Buffer.from(tx.txID, 'hex'), Buffer.from(privateData.privateKey, 'hex'))]
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' TrxTxProcessor.sendTx signed', tx)

        const send = await BlocksoftAxios.post(this._tronNodePath + '/wallet/broadcasttransaction', tx)
        // @ts-ignore
        BlocksoftCryptoLog.log(this._settings.currencyCode + ' TrxTxProcessor.sendTx broadcast', send.data)

        // @ts-ignore
        if (!send.data) {
            throw new Error('SERVER_RESPONSE_NOT_CONNECTED')
        }
        // @ts-ignore
        if (typeof send.data.Error !== 'undefined') {
            // @ts-ignore
            throw new Error(send.data.Error)
        }
        // @ts-ignore
        if (typeof send.data.result === 'undefined') {
            // @ts-ignore
            if (typeof send.data.message !== 'undefined') {
                let msg = false
                try {
                    // @ts-ignore
                    const buf = Buffer.from(send.data.message, 'hex')
                    // @ts-ignore
                    msg = buf.toString('')
                } catch (e) {
                    // do nothing
                }
                if (msg) {
                    // @ts-ignore
                    send.data.decoded = msg
                    // @ts-ignore
                    this.checkError(msg)
                }
            }
            // @ts-ignore
            this.checkError('no transaction result ' + JSON.stringify(send.data))
        }
        // @ts-ignore
        if (send.data.result !== true) {
            // @ts-ignore
            this.checkError('transaction result is false ' + JSON.stringify(send.data))
        }

        return { transactionHash: tx.txID }
    }

    checkError(msg: string) {
        if (this._settings.currencyCode !== 'TRX' && msg.indexOf('AccountResourceInsufficient') !== -1) {
            throw new Error('SERVER_RESPONSE_NOT_ENOUGH_FEE')
        } else if (msg.indexOf('balance is not sufficient') !== -1) {
            throw new Error('SERVER_RESPONSE_NOT_ENOUGH_FEE')
        } else if (msg.indexOf('account not exist') !== -1) {
            throw new Error('SERVER_RESPONSE_NOT_ENOUGH_FEE')
        } else if (msg.indexOf('Amount must greater than 0') !== -1) {
            throw new Error('SERVER_RESPONSE_NOT_ENOUGH_AMOUNT_AS_DUST')
        } else if (msg.indexOf('assetBalance must be greater than 0') !== -1 || msg.indexOf('assetBalance is not sufficient') !== -1) {
            throw new Error('SERVER_RESPONSE_NOTHING_TO_TRANSFER')
        } else {
            throw new Error(msg)
        }
    }
}
