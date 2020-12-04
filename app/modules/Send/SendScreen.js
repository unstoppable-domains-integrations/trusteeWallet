/**
 * @version 0.9
 */
import React, { Component } from 'react'

import { connect } from 'react-redux'

import { View, ScrollView, Keyboard, Text, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native'

import { KeyboardAwareView } from 'react-native-keyboard-aware-view'

import firebase from 'react-native-firebase'
import AsyncStorage from '@react-native-community/async-storage'


import TextView from '../../components/elements/Text'
import AddressInput from '../../components/elements/Input'
import AmountInput from './elements/Input'
import MemoInput from '../../components/elements/Input'
import Input from '../../components/elements/Input'
import TextareaInput from '../../components/elements/Input'
import Navigation from '../../components/navigation/Navigation'
import GradientView from '../../components/elements/GradientView'
import Button from '../../components/elements/Button'
import NavStore from '../../components/navigation/NavStore'

import { setQRConfig, setQRValue } from '../../appstores/Stores/QRCodeScanner/QRCodeScannerActions'
import { setLoaderStatus } from '../../appstores/Stores/Main/MainStoreActions'
import { showModal } from '../../appstores/Stores/Modal/ModalActions'

import { strings } from '../../services/i18n'

import { BlocksoftTransfer } from '../../../crypto/actions/BlocksoftTransfer/BlocksoftTransfer'
import { BlocksoftTransferUtils } from '../../../crypto/actions/BlocksoftTransfer/BlocksoftTransferUtils'

import BlocksoftPrettyNumbers from '../../../crypto/common/BlocksoftPrettyNumbers'
import BlocksoftDict from '../../../crypto/common/BlocksoftDict'
import BlocksoftUtils from '../../../crypto/common/BlocksoftUtils'

import DaemonCache from '../../daemons/DaemonCache'

import Log from '../../services/Log/Log'
import MarketingEvent from '../../services/Marketing/MarketingEvent'

import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import Theme from '../../themes/Themes'
import CurrencyIcon from '../../components/elements/CurrencyIcon'
import LetterSpacing from '../../components/elements/LetterSpacing'
import RateEquivalent from '../../services/UI/RateEquivalent/RateEquivalent'

import config from '../../config/config'
import UpdateOneByOneDaemon from '../../daemons/back/UpdateOneByOneDaemon'
import UpdateAccountListDaemon from '../../daemons/view/UpdateAccountListDaemon'
import api from '../../services/Api/Api'
import {
    getAccountFioName,
    getPubAddress,
    isFioAddressRegistered,
    isFioAddressValid,
    resolveChainCode
} from '../../../crypto/blockchains/fio/FioUtils'

import TwoButtons from '../../components/elements/new/buttons/TwoButtons'
import Header from '../../components/elements/new/Header'
import PartBalanceButton from './elements/partBalanceButton'

import { ThemeContext } from '../../modules/theme/ThemeProvider'
import { handleFee } from '../../appstores/Stores/Send/SendActions'

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window')

let styles

const addressInput = {
    id: 'address',
    type: 'ETH_ADDRESS'
}

const memoInput = {
    id: 'memo',
    type: 'string'
}

const amountInput = {
    id: 'value',
    type: 'AMOUNT',
    additional: 'NUMBER',
    mark: 'ETH'
}

let IS_CALLED_BACK = false
let BASIC_INPUT_TYPE = 'CRYPTO'

class SendScreen extends Component {

    constructor(props) {
        super(props)
        this.state = {
            init: false,
            account: {},
            cryptoCurrency: {},
            wallet: {},

            disabled: false,
            destinationTag: null,
            useAllFunds: false,
            description: '',

            amountInputMark: '',
            focused: false,

            enoughFunds: {
                isAvailable: true,
                messages: []
            },

            inputType: 'CRYPTO',

            toTransactionJSON: {},
            fioRequestDetails: {},
            isFioPayment: false,

            copyAddress: false,
            countedFees: false,
            selectedFee: false,

            balancePart: 0,
            headerHeight: 0,
            destinationAddress: null
        }
        this.addressInput = React.createRef()
        this.memoInput = React.createRef()
        this.valueInput = React.createRef()
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillMount() {

        AsyncStorage.getItem('sendInputType').then(res => {
            if (res !== null) {
                BASIC_INPUT_TYPE = res
                this.setState({
                    inputType: res
                })
            }
        })

        styles = Theme.getStyles().sendScreenStyles

        // @misha is it needed two inits?
        this.init()

        this._onFocusListener = this.props.navigation.addListener('didFocus', (payload) => {
            this.init()
        })
    }

    componentDidMount() {
        const fioRequest = this.props.navigation.getParam('fioRequestDetails')
        if (fioRequest) {
            if (fioRequest.content?.token_code === 'FIO') {
                this.addressInput.handleInput(fioRequest.payee_fio_address)
            } else {
                this.addressInput.handleInput(fioRequest.content?.payee_public_address)
            }
            // this.memoInput.handleInput(fioRequest.content?.memo)
            this.valueInput.handleInput(fioRequest.content?.amount)

            this.setState({
                isFioPayment: true,
                fioRequestDetails: fioRequest
            })
        }
    }

    init = async () => {
        console.log('')
        console.log('')
        console.log('Send.SendScreen.init')
        if (Object.keys(this.props.send.data).length !== 0) {
            // Log.log('INIT SEND DATA', this.props.send.data)
            console.log('Send.SendScreen.init with data', { send: this.props.send })
            let {
                sendType,
                account,
                address,
                comment = '',
                value,
                disabled,
                cryptoCurrency,
                description,
                destinationTag,
                useAllFunds,
                toTransactionJSON,
                copyAddress,
                inputType,
                type
            } = this.props.send.data
            if (type === 'TRADE_SEND') {
                inputType = 'CRYPTO'
            }
            // Log.log(inputType, type)

            const toState = {
                account,
                cryptoCurrency,
                description,
                destinationTag,
                useAllFunds,
                inputType: inputType || BASIC_INPUT_TYPE,
                init: true
            }

            if (typeof toTransactionJSON !== 'undefined') {
                toState.toTransactionJSON = toTransactionJSON
            }

            if (typeof disabled !== 'undefined') {
                toState.disabled = disabled
            }

            if (typeof copyAddress !== 'undefined') {
                toState.copyAddress = copyAddress
            }

            this.setState({
                ...toState
            }, () => {

                if (typeof this.memoInput.handleInput !== 'undefined') {
                    if (typeof destinationTag === 'undefined') {
                        destinationTag = ''
                    }
                    this.memoInput.handleInput(destinationTag)
                }

                this.addressInput.handleInput(address)
                // this.commentInput.handleInput(comment)
                this.valueInput.handleInput(value)
                this.amountInputCallback(value === '' ? this.valueInput.getValue() : value)

                if (sendType === 'REPLACE_TRANSACTION') {
                    setTimeout(() => {
                        this.handleSendTransaction()
                    }, 500)

                }

                this.setState({
                    useAllFunds: false
                })

            })
        } else {
            console.log('Send.SendScreen.init without data', { send: this.props.send })
            const { account, cryptoCurrency } = this.props


            let countedFees = false
            let selectedFee = false
            if (typeof this.props.send.countedFees !== 'undefined' && this.props.send.countedFees && this.props.send.countedFees !== {}) {
                countedFees = this.props.send.countedFees
            }
            if (typeof this.props.send.selectedFee !== 'undefined' && this.props.send.selectedFee && this.props.send.selectedFee !== {}) {
                selectedFee = this.props.send.selectedFee
            }
            setLoaderStatus(false)

            this.setState({
                account,
                cryptoCurrency,
                countedFees,
                selectedFee,
                init: true,
                description: strings('send.description')
            }, () => {
                this.amountInputCallback()
            })
        }
    }

    setHeaderHeight = (height) => {
        const headerHeight = Math.round(height || 0)
        this.setState(() => ({ headerHeight }))
    }

    handleChangeEquivalentType = () => {
        console.log('Send.SendScreen.handleChangeEquivalentType')
        const { currencySymbol } = this.state.cryptoCurrency
        const { basicCurrencySymbol } = this.state.account

        const inputType = this.state.inputType === 'CRYPTO' ? 'FIAT' : 'CRYPTO'

        AsyncStorage.setItem('sendInputType', inputType)

        let amountEquivalent

        const toInput = (!(1 * this.state.amountEquivalent) ? '' : this.state.amountEquivalent).toString()
        const toEquivalent = !this.valueInput.getValue() ? '0' : this.valueInput.getValue()

        if (inputType === 'FIAT') {
            amountEquivalent = toEquivalent
            this.valueInput.handleInput(toInput)
        } else {
            amountEquivalent = toEquivalent
            this.valueInput.handleInput(toInput)
        }

        this.setState({
            amountInputMark: this.state.inputType === 'FIAT' ? `~ ${basicCurrencySymbol} ${amountEquivalent}` : `~ ${amountEquivalent} ${currencySymbol}`,
            amountEquivalent,
            inputType
        })
    }

    handleGetFee = async (value, inputType, equivalent) => {
        const { countedFees, selectedFee, useAllFunds } = this.state
        console.log('Send.SendScreen.handleGetFee ', JSON.parse(JSON.stringify({ value, inputType, equivalent })))
        console.log('Send.SendScreen.handleGetFee state', { countedFees, selectedFee, useAllFunds })
        const {
            walletHash,
            walletUseUnconfirmed,
            walletAllowReplaceByFee,
            walletUseLegacy,
            walletIsHd
        } = this.props.wallet

        const { address, derivationPath, currencyCode, balance, unconfirmed, accountJson } = this.state.account

        const extend = BlocksoftDict.getCurrencyAllSettings(currencyCode)

        try {
            Log.log(`SendScreen.handleGetFee balance ${currencyCode} ${address} data ${balance} + ${unconfirmed}`)

            let addressToForTransferAll = BlocksoftTransferUtils.getAddressToForTransferAll({ currencyCode, address })

            // YURA, its important to use entered address as its very important and fees need to be recalculated when destination is changed!
            const addressValidate = await this.addressInput.handleValidate()
            if (addressValidate.status === 'success') {
                addressToForTransferAll = addressValidate.value
            }

            Log.log(`SendScreen.handleTransferAll balance ${currencyCode} ${address} addressToTransfer`, addressToForTransferAll)

            const countedFeesData = {
                currencyCode,
                walletHash,
                derivationPath,
                addressFrom: address,
                addressTo: addressToForTransferAll,

                amount: BlocksoftPrettyNumbers.setCurrencyCode(currencyCode).makeUnPretty(inputType === 'CRYPTO' ? value : equivalent),
                balance: balance,
                unconfirmed: walletUseUnconfirmed === 1 ? unconfirmed : 0,

                isTransferAll: false,
                useOnlyConfirmed: !(walletUseUnconfirmed === 1),
                allowReplaceByFee: walletAllowReplaceByFee === 1,
                useLegacy: walletUseLegacy,
                isHd: walletIsHd,

                accountJson
            }
            let addData = {}
            if (typeof selectedFee !== 'undefined') {
                addData = selectedFee
                if (typeof selectedFee.blockchainData !== 'undefined' && typeof selectedFee.blockchainData.unspents !== 'undefined') {
                    addData.unspents = selectedFee.blockchainData.unspents
                }
            }

            const transferCount = await BlocksoftTransfer.getFeeRate(countedFeesData, addData)
            transferCount.feesCountedForData = countedFeesData

            let newSelectedFee = transferCount.fees[transferCount.selectedFeeIndex]
            if (typeof selectedFee !== 'undefined' && typeof selectedFee.isCustomFee !== 'undefined') {
                newSelectedFee = selectedFee.isCustomFee
            }
            handleFee(transferCount, newSelectedFee)

            const amount = BlocksoftPrettyNumbers.setCurrencyCode(currencyCode).makePretty(transferCount.feesCountedForData.amount)

            this.setState({
                useAllFunds: false,
                countedFees: transferCount,
                selectedFee: newSelectedFee
            })

            // setLoaderStatus(false)
            console.log('Send.SendScreen.handleGetFee currencyBalanceAmount: ', amount, 'currencyBalanceAmountRaw: ', transferCount.feesCountedForData.amount)
            return { currencyBalanceAmount: amount, currencyBalanceAmountRaw: transferCount.feesCountedForData.amount }


        } catch (e) {
            if (config.debug.cryptoErrors) {
                console.log('Send.SendScreen.handleGetFee', e)
            }
            Log.errorTranslate(e, 'Send.SendScreen.handleGetFee', typeof extend.addressCurrencyCode === 'undefined' ? extend.currencySymbol : extend.addressCurrencyCode, JSON.stringify(extend))

            Keyboard.dismiss()

            showModal({
                type: 'INFO_MODAL',
                icon: null,
                title: strings('modal.qrScanner.sorry'),
                description: e.message,
                error: e
            })
        }
    }

    handleTransferAll = async (handleInput = true) => {
        console.log('Send.SendScreen.handlTransferAll')
        Keyboard.dismiss()

        setLoaderStatus(true)

        const {
            walletHash,
            walletUseUnconfirmed,
            walletAllowReplaceByFee,
            walletUseLegacy,
            walletIsHd
        } = this.props.wallet

        const { address, derivationPath, currencyCode, balance, unconfirmed, accountJson } = this.state.account


        const extend = BlocksoftDict.getCurrencyAllSettings(currencyCode)

        try {
            Log.log(`SendScreen.handleTransferAll balance ${currencyCode} ${address} data ${balance} + ${unconfirmed}`)

            let addressToForTransferAll = BlocksoftTransferUtils.getAddressToForTransferAll({ currencyCode, address })

            const addressValidate = handleInput ? await this.addressInput.handleValidate() : { status: 'fail' }

            if (addressValidate.status === 'success') {
                addressToForTransferAll = addressValidate.value
            }

            Log.log(`SendScreen.handleTransferAll balance ${currencyCode} ${address} addressToForTransferAll`, addressToForTransferAll)

            const countedFeesData = {
                currencyCode,
                walletHash,
                derivationPath,
                addressFrom: address,
                addressTo: addressToForTransferAll,

                amount: balance,
                unconfirmed: walletUseUnconfirmed === 1 ? unconfirmed : 0,

                isTransferAll: true,
                useOnlyConfirmed: !(walletUseUnconfirmed === 1),
                allowReplaceByFee: walletAllowReplaceByFee === 1,
                useLegacy: walletUseLegacy,
                isHd: walletIsHd,

                accountJson
            }
            const transferAllCount = await BlocksoftTransfer.getTransferAllBalance(countedFeesData)
            transferAllCount.feesCountedForData = countedFeesData

            const selectedFee = transferAllCount.fees[transferAllCount.selectedFeeIndex]
            handleFee(transferAllCount, selectedFee)

            const amount = BlocksoftPrettyNumbers.setCurrencyCode(currencyCode).makePretty(transferAllCount.selectedTransferAllBalance)

            this.setState({
                inputType: 'CRYPTO',
                useAllFunds: true,
                countedFees: transferAllCount,
                selectedFee
            })

            try {
                if (handleInput
                    && typeof this.valueInput !== 'undefined' && this.valueInput
                    && typeof this.valueInput.handleInput !== 'undefined' && this.valueInput.handleInput
                    && typeof amount !== 'undefined' && amount !== null
                ) {
                    this.valueInput.handleInput(amount, false)
                    this.amountInputCallback(amount, false)
                }
            } catch (e) {
                e.message += ' while this.valueInput.handleInput amount ' + amount
                throw e
            }

            setLoaderStatus(false)
            console.log('Send.SendScreen.handleTransferAll currencyBalanceAmount: ', amount, 'currencyBalanceAmountRaw: ', transferAllCount.selectedTransferAllBalance)
            return {
                currencyBalanceAmount: amount,
                currencyBalanceAmountRaw: transferAllCount.selectedTransferAllBalance
            }


        } catch (e) {
            if (config.debug.cryptoErrors) {
                console.log('Send.SendScreen.handleTransferAll', e)
            }
            Log.errorTranslate(e, 'Send.SendScreen.handleTransferAll', typeof extend.addressCurrencyCode === 'undefined' ? extend.currencySymbol : extend.addressCurrencyCode, JSON.stringify(extend))

            Keyboard.dismiss()

            showModal({
                type: 'INFO_MODAL',
                icon: null,
                title: strings('modal.qrScanner.sorry'),
                description: e.message,
                error: e
            })
        }

        setLoaderStatus(false)
    }

    handleOkForce = async () => {
        showModal({
            type: 'YES_NO_MODAL',
            icon: 'WARNING',
            title: strings('send.confirmModal.title'),
            description: strings('send.confirmModal.force')
        }, () => {
            this.handleSendTransaction(false, true, true)
        })
    }

    handleSendTransaction = async (forceSendAll = false, fromModal = false, forceSendAmount = false) => {

        if (forceSendAll) {
            await this.handleTransferAll()
        }

        console.log('Send.SendScreen.handleSendTransaction started ' + JSON.stringify({
            forceSendAmount,
            forceSendAll,
            fromModal
        }))

        const {
            account,
            cryptoCurrency,
            toTransactionJSON,
            useAllFunds,
            fioRequestDetails,
            isFioPayment,
            amountEquivalent,
            inputType,
            countedFees,
            selectedFee
        } = this.state

        console.log('Send.SendScreen.handleSendTransaction state', JSON.parse(JSON.stringify({
            countedFees,
            selectedFee
        })))

        const addressValidation = await this.addressInput.handleValidate()
        const valueValidation = await this.valueInput.handleValidate()
        // const commentValidation = await this.commentInput.handleValidate()
        const destinationTagValidation = typeof this.memoInput.handleInput !== 'undefined' ? await this.memoInput.handleValidate() : {
            status: 'success',
            value: false
        }

        const wallet = this.props.wallet

        const extend = BlocksoftDict.getCurrencyAllSettings(cryptoCurrency.currencyCode)

        if (addressValidation.status !== 'success') {
            Log.log('Send.SendScreen.handleSendTransaction invalid address ' + JSON.stringify(addressValidation))
            return
        }
        if (!forceSendAmount && valueValidation.status !== 'success') {
            Log.log('Send.SendScreen.handleSendTransaction invalid value ' + JSON.stringify(valueValidation))
            return
        }
        if (!forceSendAmount && valueValidation.value === 0) {
            Log.log('Send.SendScreen.handleSendTransaction value is 0 ' + JSON.stringify(valueValidation))
            return
        }
        // if (commentValidation.status !== 'success') {
        //     Log.log('Send.SendScreen.handleSendTransaction invalid comment ' + JSON.stringify(commentValidation))
        //     return
        // }
        if (destinationTagValidation.status !== 'success') {
            Log.log('Send.SendScreen.handleSendTransaction invalid destination ' + JSON.stringify(destinationTagValidation))
            return
        }

        Keyboard.dismiss()

        const enoughFunds = {
            isAvailable: true,
            messages: []
        }

        if (!forceSendAmount && typeof extend.delegatedTransfer === 'undefined' && typeof extend.feesCurrencyCode !== 'undefined' && typeof extend.skipParentBalanceCheck === 'undefined') {
            const parentCurrency = await DaemonCache.getCacheAccount(account.walletHash, extend.feesCurrencyCode)
            if (parentCurrency) {
                const parentBalance = parentCurrency.balance * 1
                if (parentBalance === 0) {
                    enoughFunds.isAvailable = false
                    let msg
                    if (typeof parentCurrency.unconfirmed !== 'undefined' && parentCurrency.unconfirmed > 0) {
                        msg = strings('send.notEnoughForFeeConfirmed', { symbol: extend.addressCurrencyCode })
                    } else {
                        msg = strings('send.notEnoughForFee', { symbol: extend.addressCurrencyCode })
                    }
                    enoughFunds.messages.push(msg)
                    Log.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentBalance not ok ' + parentBalance, parentCurrency)
                    if (config.debug.appErrors) {
                        console.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentBalance not ok ' + parentBalance, parentCurrency)
                    }
                } else if (cryptoCurrency.currencyCode === 'USDT' && parentBalance < 550) {
                    let msg
                    if (typeof parentCurrency.unconfirmed !== 'undefined' && parentCurrency.unconfirmed > 0) {
                        msg = strings('send.errors.SERVER_RESPONSE_LEGACY_BALANCE_NEEDED_USDT_WAIT_FOR_CONFIRM', { symbol: extend.addressCurrencyCode })
                    } else {
                        msg = strings('send.errors.SERVER_RESPONSE_LEGACY_BALANCE_NEEDED_USDT', { symbol: extend.addressCurrencyCode })
                    }
                    enoughFunds.isAvailable = false
                    enoughFunds.messages.push(msg)
                    Log.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentBalance not ok usdt ' + parentBalance, parentCurrency)
                    if (config.debug.appErrors) {
                        console.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentBalance not ok usdt ' + parentBalance, parentCurrency)
                    }
                } else {
                    Log.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentBalance is ok ' + parentBalance, parentCurrency)
                }
            } else {
                Log.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' to ' + addressValidation.value + ' parentCurrency not found ' + parentCurrency, parentCurrency)
            }


            if (enoughFunds.messages.length) {
                this.setState({ enoughFunds })
                return
            }
        }

        setLoaderStatus(true)

        const amount = this.state.inputType === 'FIAT' ? this.state.amountEquivalent : valueValidation.value
        // const comment = commentValidation.value
        const memo = destinationTagValidation.value.toString()

        let fioPaymentData
        let recipientAddress = addressValidation.value

        try {
            if (this.isFioAddress(recipientAddress)) {
                Log.log('Send.SendScreen.handleSendTransaction isFioAddress checked ' + recipientAddress)
                if (await isFioAddressRegistered(recipientAddress)) {
                    Log.log('Send.SendScreen.handleSendTransaction isFioAddressRegistered checked ' + recipientAddress)
                    const chainCode = resolveChainCode(cryptoCurrency.currencyCode, cryptoCurrency.currencySymbol)
                    const publicFioAddress = await getPubAddress(addressValidation.value, chainCode, cryptoCurrency.currencySymbol)
                    Log.log('Send.SendScreen.handleSendTransaction public for ' + recipientAddress + ' ' + chainCode + ' =>' + publicFioAddress)
                    if (!publicFioAddress || publicFioAddress === '0') {
                        const msg = strings('send.publicFioAddressNotFound', { symbol: cryptoCurrency.currencyCode })
                        Log.log('Send.SendScreen.handleSendTransaction ' + msg)
                        enoughFunds.isAvailable = false
                        enoughFunds.messages.push(msg)
                        setLoaderStatus(false)
                        this.setState({ enoughFunds })
                        return
                    }
                    recipientAddress = publicFioAddress
                    if (fioRequestDetails && fioRequestDetails.fio_request_id) {
                        fioPaymentData = fioRequestDetails
                    } else {
                        fioPaymentData = {
                            payer_fio_address: await getAccountFioName(),
                            payee_fio_address: addressValidation.value,
                            memo
                        }
                    }
                } else {
                    Log.log('Send.SendScreen.handleSendTransaction isFioAddressRegistered no result ' + recipientAddress)
                    const msg = strings('send.publicFioAddressNotFound', { symbol: cryptoCurrency.currencyCode })
                    Log.log('Send.SendScreen.handleSendTransaction ' + msg)
                    enoughFunds.isAvailable = false
                    enoughFunds.messages.push(msg)
                    setLoaderStatus(false)
                    this.setState({ enoughFunds })
                    return
                }
            }
        } catch (e) {
            Log.log('Send.SendScreen.handleSendTransaction isFioAddress error ' + recipientAddress + ' => ' + e.message)
        }

        try {
            // toTransactionJSON.comment = comment

            const amountRaw = BlocksoftPrettyNumbers.setCurrencyCode(cryptoCurrency.currencyCode).makeUnPretty(amount)
            if (typeof amountRaw === 'undefined') {
                Log.err('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' not ok amountRaw ', {
                    'eq': this.state.amountEquivalent,
                    'vaL': valueValidation.value,
                    amount,
                    amountRaw
                })
            }
            const balanceRaw = account.balanceRaw

            if (!forceSendAmount) {
                let diff = BlocksoftUtils.diff(amountRaw, balanceRaw)
                if (cryptoCurrency.currencyCode === 'XRP') {
                    diff = BlocksoftUtils.add(diff, 20)
                }
                if (diff > 0) {
                    Log.log('Send.SendScreen.handleSendTransaction ' + cryptoCurrency.currencyCode + ' not ok diff ' + diff, {
                        amountRaw,
                        balanceRaw
                    })
                    enoughFunds.isAvailable = false
                    enoughFunds.messages.push(strings('send.notEnough'))
                }

                if (enoughFunds.messages.length) {
                    this.setState({ enoughFunds })
                    setLoaderStatus(false)
                    return
                }
            }

            try {
                if (fromModal === false && BlocksoftTransfer.checkSendAllModal({ currencyCode: cryptoCurrency.currencyCode })) {

                    const limitPercent = 0.95

                    let percentCheck
                    let diffCheck

                    if (inputType === 'FIAT') {
                        percentCheck = BlocksoftUtils.diff(BlocksoftUtils.div(amountEquivalent, account.balancePretty), limitPercent)
                    } else {
                        percentCheck = BlocksoftUtils.diff(BlocksoftUtils.div(valueValidation.value, account.balancePretty), limitPercent)
                        diffCheck = BlocksoftUtils.diff(account.balancePretty, valueValidation.value)
                    }

                    console.log('input', {
                        amountCrypto: valueValidation.value,
                        percentCheck,
                        diffCheck,
                        useAll: useAllFunds
                    })

                    Log.log('Send.SendScreen.handleSendTransaction input', {
                        amountCrypto: valueValidation.value,
                        percentCheck,
                        diffCheck,
                        useAll: useAllFunds
                    })

                    if (useAllFunds === false && percentCheck * 1 > 0) {
                        showModal({
                            type: 'YES_NO_MODAL',
                            icon: 'WARNING',
                            title: strings('modal.titles.attention'),


                            description: strings('modal.infoSendAllModal.description', { coin: cryptoCurrency.currencyName }),
                            reverse: true,
                            noCallback: () => {
                                this.handleSendTransaction(true, true)
                            }
                        }, () => {
                            this.handleSendTransaction(false, true)
                        })
                        return
                    }
                }
            } catch (e) {
                Log.log('Send.SendScreen.handleSendTransaction infoSendAllModal error ' + e.message)
            }


            this.setState({
                enoughFunds: {
                    isAvailable: true,
                    messages: []
                },
                balance: cryptoCurrency.currencyBalanceAmount
            })

            setTimeout(() => {
                console.log('Send.SendScreen.handleSendTransaction amount ' + amount + ' recipientAddress ' + recipientAddress, countedFees, selectedFee)

                const data = {
                    memo,
                    amount: typeof amount === 'undefined' ? '0' : amount.toString(),
                    amountRaw,
                    address: recipientAddress,
                    wallet,
                    cryptoCurrency,
                    account,
                    useAllFunds,
                    toTransactionJSON,
                    type: this.props.send.data.type,
                    currencyCode: cryptoCurrency.currencyCode,
                    countedFees
                }

                NavStore.goNext('ReceiptScreen', {
                    ReceiptScreen: data,
                    ...(isFioPayment && { fioRequestDetails: fioPaymentData })
                })

                MarketingEvent.checkSellConfirm({
                    memo: memo.toString(),
                    currencyCode: cryptoCurrency.currencyCode,
                    addressFrom: account.address,
                    addressTo: data.address,
                    addressAmount: data.amount,
                    walletHash: account.walletHash
                })
            }, 500)
        } catch (e) {

            setLoaderStatus(false)
            Log.err('Send.SendScreen.handleSendTransaction error', e)
        }

        Log.log('Send.SendScreen.handleSendTransaction finished')

    }

    amountInputCallback = (value, changeUseAllFunds) => {
        const { countedFees, selectedFee, useAllFunds } = this.state
        console.log('Send.SendScreen.amountInputCallback state', { countedFees, selectedFee, useAllFunds })

        const { currencySymbol, currencyCode } = this.state.cryptoCurrency
        const { basicCurrencySymbol, basicCurrencyRate } = this.state.account

        if (useAllFunds && changeUseAllFunds) {
            this.setState({
                useAllFunds: false
            })
        }

        let amount = 0
        let symbol = currencySymbol

        try {
            if (!value || value === 0) {
                amount = 0
                symbol = ''
            } else if (this.state.inputType === 'CRYPTO') {
                amount = RateEquivalent.mul({ value, currencyCode, basicCurrencyRate })
                symbol = basicCurrencySymbol
            } else {
                amount = RateEquivalent.div({ value, currencyCode, basicCurrencyRate })
            }
        } catch (e) {
            Log.log('Send.SendScreen equivalent error ' + e.message)
        }

        if (amount > 0) {

            if (!this.state.useAllFunds) {
                this.handleGetFee(value, this.state.inputType, amount)
            }

            this.setState({
                amountEquivalent: amount,
                amountInputMark: `${amount} ${symbol}`,
                balancePart: 0
            })
        }
        IS_CALLED_BACK = false
    }

    onFocus = () => {
        this.setState({
            focused: true
        })

        setTimeout(() => {
            try {
                this.scrollView.scrollTo({ y: 120 })
            } catch (e) {
            }
        }, 500)
    }

    renderEnoughFundsError = () => {
        const { enoughFunds } = this.state

        Log.log('Send.SendScreen renderEnoughFundsError', enoughFunds)
        if (!enoughFunds.isAvailable) {
            return (
                <View style={{ marginTop: 14 }}>
                    {
                        enoughFunds.messages.map((item, index) => {
                            return (
                                <View key={index} style={styles.texts}>
                                    <View style={styles.texts__icon}>
                                        <Icon
                                            name="information-outline"
                                            size={22}
                                            color="#864DD9"
                                        />
                                    </View>
                                    <View>
                                        <TouchableOpacity style={styles.texts__item} delayLongPress={500}
                                                          onLongPress={() => this.handleOkForce()}>
                                            <Text>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )
                        })
                    }
                </View>
            )
        }
    }

    renderAccountDetail = () => {

        const { currencySymbol, currencyName, currencyCode } = this.state.cryptoCurrency
        const { basicCurrencyRate, balancePretty, unconfirmedPretty } = this.state.account
        const { walletUseUnconfirmed } = this.state.wallet

        const amount = walletUseUnconfirmed === 1 ? BlocksoftUtils.add(balancePretty, unconfirmedPretty).toString() : balancePretty
        const amountPrep = BlocksoftPrettyNumbers.makeCut(amount).cutted

        let sumPrep = amountPrep + ' ' + currencySymbol
        if (amount && currencyCode && basicCurrencyRate) {
            try {
                const basicCurrencySymbol = this.state.account.basicCurrencySymbol || '$'
                const basicAmount = RateEquivalent.mul({ value: amount, currencyCode, basicCurrencyRate })
                const basicAmountPrep = BlocksoftPrettyNumbers.makeCut(basicAmount, 2).cutted
                if (this.state.inputType === 'CRYPTO') {
                    sumPrep += ' / ~' + basicCurrencySymbol + ' ' + basicAmountPrep
                } else {
                    sumPrep = '~' + basicCurrencySymbol + ' ' + basicAmountPrep + ' / ' + sumPrep
                }
            } catch (e) {
                Log.log('Send.SendScreen renderAccountDetail error ' + e.message)
            }
        }

        return (
            // <View style={styles.accountDetail}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View>
                    <CurrencyIcon currencyCode={currencyCode}
                                  containerStyle={{}} />
                </View>
                <View style={styles.accountDetail__content}>
                    <View style={{}}>
                        <Text style={styles.accountDetail__title} numberOfLines={1}>
                            {currencyName}
                        </Text>
                        <View style={{ alignItems: 'flex-start' }}>
                            <LetterSpacing text={sumPrep} textStyle={styles.accountDetail__text} letterSpacing={1} />
                        </View>
                    </View>
                </View>
            </View>
            // </View>
        )
    }

    minerFee = () => {
        const { countedFees, selectedFee, useAllFunds } = this.state
        console.log('Send.SendScreen.minerFee state', JSON.parse(JSON.stringify({
            countedFees,
            selectedFee,
            useAllFunds
        })))

        if (!selectedFee) return null

        const { basicCurrencySymbol, feesCurrencyCode, feesCurrencySymbol, feeRates } = this.props.account

        let prettyFee
        let prettyFeeSymbol = feesCurrencySymbol
        let feeBasicCurrencySymbol = basicCurrencySymbol
        let feeBasicAmount = 0

        if (typeof selectedFee.feeForTxDelegated !== 'undefined') {
            prettyFeeSymbol = '?' //currencySymbol
            prettyFee = selectedFee.feeForTxCurrencyAmount
            feeBasicAmount = BlocksoftPrettyNumbers.makeCut(selectedFee.feeForTxBasicAmount, 5).justCutted
            feeBasicCurrencySymbol = selectedFee.feeForTxBasicSymbol
        } else {
            prettyFee = BlocksoftPrettyNumbers.setCurrencyCode(feesCurrencyCode).makePretty(selectedFee.feeForTx)
            feeBasicAmount = BlocksoftPrettyNumbers.makeCut(RateEquivalent.mul({
                value: prettyFee,
                currencyCode: feesCurrencyCode,
                basicCurrencyRate: feeRates.basicCurrencyRate
            }), 5).justCutted
            prettyFee = BlocksoftPrettyNumbers.makeCut(prettyFee, 5).justCutted
        }

        let fiatFee
        if (Number(feeBasicAmount) < 0.01) {
            fiatFee = `> ${feeBasicCurrencySymbol} 0.01`
        } else {
            fiatFee = `${feeBasicCurrencySymbol} ${feeBasicAmount}`
        }

        // `${feeBasicCurrencySymbol} ${feeBasicAmount}`
        return (
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, justifyContent: 'space-between' }}>
                <View style={{ width: '50%' }}>
                    <LetterSpacing numberOfLines={2} text={'Miner fee'} textStyle={style.minerFee}
                                   letterSpacing={0.5} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <LetterSpacing text={`${prettyFee} ${prettyFeeSymbol}`} textStyle={style.minerFee}
                                   letterSpacing={0.5} />
                    <LetterSpacing text={fiatFee} textStyle={{ ...style.fiatFee, paddingTop: 5, color: '#999999' }}
                                   letterSpacing={1.5} />
                </View>
            </View>
        )
    }

    closeAction = () => {
        const { toTransactionJSON } = this.props.send.data

        if (typeof toTransactionJSON !== 'undefined' && typeof toTransactionJSON.bseOrderID !== 'undefined') {
            api.setExchangeStatus(toTransactionJSON.bseOrderID, 'close')
        }

        NavStore.goBack()
    }

    openAdvancedSettings = () => {
        const { countedFees, selectedFee, useAllFunds } = this.state
        console.log('Send.SendScreen.openAdvancedSettings state', JSON.parse(JSON.stringify({
            countedFees,
            selectedFee,
            useAllFunds
        })))
        if (!countedFees) {
            console.log('YURA, plz show loaded here')
        } else {
            NavStore.goNext('SendAdvancedScreen', {
                data: {
                    countedFees,
                    selectedFee,
                    useAllFunds
                }
            })
        }
    }

    modalInfo = (currencyCode) => {
        showModal({
            type: 'INFO_MODAL',
            icon: null,
            title: strings('modal.qrScanner.sorry'),
            description: currencyCode === 'XRP' ? 'xrp' : currencyCode === 'XMR' ? 'xmr' : 'fio' // ehhhh
        })
    }

    render() {
        UpdateOneByOneDaemon.pause()
        UpdateAccountListDaemon.pause()
        firebase.analytics().setCurrentScreen('Send.SendScreen')

        const route = NavStore.getCurrentRoute()
        if (route.routeName === 'Send.SendScreen') {
            if (!IS_CALLED_BACK) {
                if (typeof this.state.amountEquivalent === 'undefined' || this.state.amountEquivalent.toString() === '0') {
                    if (typeof this.valueInput !== 'undefined' && typeof this.valueInput.getValue !== 'undefined') {
                        const value = this.valueInput.getValue()
                        if (value) {
                            IS_CALLED_BACK = true
                            this.amountInputCallback(value)
                        }
                    }
                }
            }
        } else {
            IS_CALLED_BACK = false
        }

        const {
            disabled,
            description,
            amountInputMark,
            focused,
            copyAddress,
            isFioPayment,
            headerHeight
        } = this.state

        const {
            currencySymbol,
            currencyCode,
            extendsProcessor,
            addressUiChecker,
            decimals,
            network
        } = this.state.cryptoCurrency

        const { colors, GRID_SIZE, isLight } = this.context

        const basicCurrencyCode = this.state.account.basicCurrencyCode || 'USD'

        // actually should be dict[extendsProcessor].addressUIChecker check but not to take all store will keep simplier
        let extendedAddressUiChecker = (typeof addressUiChecker !== 'undefined' && addressUiChecker ? addressUiChecker : extendsProcessor)
        if (!extendedAddressUiChecker) {
            extendedAddressUiChecker = currencyCode
        }

        const { type } = this.props.send.data

        const prev = NavStore.getPrevRoute().routeName

        const notEquivalentValue = this.state.amountInputMark ? this.state.amountInputMark : '0.00'
        //  this.state.inputType === 'CRYPTO' ?
        //     `~ ${this.state.account.basicCurrencySymbol || '$'} 0.00` : `0.00 ${this.state.cryptoCurrency.currencySymbol}`

        return (
            <View style={{ flex: 1, backgroundColor: colors.common.background }}>
                <Header
                    leftType='back'
                    leftAction={this.closeAction}
                    rightType="close"
                    rightAction={this.closeAction}
                    title={strings('send.title')}
                    ExtraView={this.renderAccountDetail}
                    setHeaderHeight={this.setHeaderHeight}
                />
                <KeyboardAwareView>
                    {/* <SafeAreaView style={[styles.content, {
                                backgroundColor: colors.common.background,
                                marginTop: headerHeight,
                                height: WINDOW_HEIGHT - headerHeight
                            }]}> */}
                    <ScrollView
                        ref={(ref) => {
                            this.scrollView = ref
                        }}
                        keyboardShouldPersistTaps={'handled'}
                        showsVerticalScrollIndicator={false}
                        // contentContainerStyle={focused ? styles.wrapper__content_active : styles.wrapper__content}
                        // style={styles.wrapper__scrollView}>
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: 'space-between',
                            padding: GRID_SIZE,
                            paddingBottom: GRID_SIZE * 2
                        }}
                        style={{ marginTop: headerHeight }}
                    >
                        <View>
                            <AmountInput
                                ref={component => this.valueInput = component}
                                id={amountInput.id}
                                additional={amountInput.additional}
                                tapText={this.state.inputType === 'FIAT' ? basicCurrencyCode : currencySymbol}
                                onFocus={() => this.onFocus()}
                                // autoFocus={true}
                                name={strings('send.value')}
                                type={amountInput.type}
                                decimals={decimals < 10 ? decimals : 10}
                                keyboardType={'numeric'}
                                enoughFunds={!this.state.enoughFunds.isAvailable}
                                disabled={disabled}
                                noEdit={prev === 'TradeScreenStack' || prev === 'ExchangeScreenStack' || prev === 'TradeV3ScreenStack' ? true : 0}
                                callback={(value) => this.amountInputCallback(value, true)}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                <View style={style.line} />
                                <TouchableOpacity style={{ position: 'absolute', right: 22, marginTop: -2 }}
                                                  onPress={this.handleChangeEquivalentType}>
                                    <Text>{'<>'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
                                <LetterSpacing text={notEquivalentValue} textStyle={style.notEquivalentValue}
                                               letterSpacing={1.5} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <PartBalanceButton
                                    action={() => {
                                        if (this.state.inputType === 'FIAT') {
                                            this.valueInput.state.value = (this.state.account.basicCurrencyBalance * 0.25).toString()
                                            this.amountInputCallback((this.state.account.basicCurrencyBalance * 0.25), true)
                                        } else {
                                            this.valueInput.state.value = (this.state.account.balancePretty * 0.25).toString()
                                            this.amountInputCallback((this.state.account.balancePretty * 0.25), true)
                                        }

                                        this.setState({
                                            balancePart: 0.25,
                                            useAllFunds: false
                                        })
                                    }}
                                    text={'25%'}
                                    inverse={this.state.balancePart === 0.25 ? true : false}
                                />
                                <PartBalanceButton
                                    action={() => {
                                        if (this.state.inputType === 'FIAT') {
                                            this.valueInput.state.value = (this.state.account.basicCurrencyBalance * 0.5).toString()
                                            this.amountInputCallback((this.state.account.basicCurrencyBalance * 0.5), true)
                                        } else {
                                            this.valueInput.state.value = (this.state.account.balancePretty * 0.5).toString()
                                            this.amountInputCallback((this.state.account.balancePretty * 0.5), true)
                                        }
                                        this.setState({
                                            balancePart: 0.5,
                                            useAllFunds: false
                                        })
                                    }}
                                    text={'50%'}
                                    inverse={this.state.balancePart === 0.5 ? true : false}
                                />
                                <PartBalanceButton
                                    action={() => {
                                        if (this.state.inputType === 'FIAT') {
                                            this.valueInput.state.value = (this.state.account.basicCurrencyBalance * 0.75).toString()
                                            this.amountInputCallback((this.state.account.basicCurrencyBalance * 0.75), true)
                                        } else {
                                            this.valueInput.state.value = (this.state.account.balancePretty * 0.75).toString()
                                            this.amountInputCallback((this.state.account.balancePretty * 0.75), true)
                                        }
                                        this.setState({
                                            balancePart: 0.75,
                                            useAllFunds: false
                                        })
                                    }}
                                    text={'75%'}
                                    inverse={this.state.balancePart === 0.75 ? true : false}
                                />
                                <PartBalanceButton
                                    action={() => {
                                        this.setState({
                                            useAllFunds: !this.state.useAllFunds,
                                            balancePart: 0
                                        })
                                        this.handleTransferAll()
                                    }}
                                    text={'100%'}
                                    inverse={this.state.useAllFunds ? true : false}
                                />
                            </View>

                            {this.renderEnoughFundsError()}

                            <View style={{ marginTop: 20 }}>
                                <AddressInput
                                    ref={component => this.addressInput = component}
                                    id={addressInput.id}
                                    // onFocus={() => this.onFocus()}
                                    name={strings('send.address')}
                                    type={extendedAddressUiChecker.toUpperCase() + '_ADDRESS'}
                                    subtype={network}
                                    cuttype={currencySymbol}
                                    paste={!disabled}
                                    fio={disabled}
                                    copy={copyAddress}
                                    qr={!disabled}
                                    qrCallback={() => {
                                        setQRConfig({
                                            account: this.state.account,
                                            cryptoCurrency: this.state.cryptoCurrency,
                                            currencyCode,
                                            inputType: this.state.inputType,
                                            title: strings('modal.qrScanner.success.title'),
                                            description: strings('modal.qrScanner.success.description'),
                                            type: 'SEND_SCANNER'
                                        })
                                        setQRValue('')
                                        NavStore.goNext('QRCodeScannerScreen')
                                    }}
                                    disabled={disabled}
                                    validPlaceholder={true}
                                    // callback={(value) => {
                                    //     console.log(value)
                                    //     this.setState({
                                    //     destinationAddress: value
                                    // })}}
                                    noEdit={prev === 'TradeScreenStack' || prev === 'ExchangeScreenStack' || prev === 'TradeV3ScreenStack' ? true : 0}
                                />
                            </View>
                            {
                                currencyCode === 'XRP' ?
                                    <MemoInput
                                        ref={component => this.memoInput = component}
                                        id={memoInput.id}
                                        disabled={disabled}
                                        name={strings('send.xrp_memo')}
                                        type={extendedAddressUiChecker.toUpperCase() + '_DESTINATION_TAG'}
                                        keyboardType={'numeric'}
                                        decimals={0}
                                        additional={'NUMBER'}
                                        info={true}
                                        tabInfo={() => this.modalInfo(currencyCode)}
                                    /> : null
                            }

                            {
                                currencyCode === 'XMR' ?
                                    <MemoInput
                                        ref={component => this.memoInput = component}
                                        id={memoInput.id}
                                        disabled={disabled}
                                        name={strings('send.xmr_memo')}
                                        type={extendedAddressUiChecker.toUpperCase() + '_DESTINATION_TAG'}
                                        keyboardType={'default'}
                                        info={true}
                                        tabInfo={() => this.modalInfo(currencyCode)}
                                    /> : null
                            }

                            {/* <View style={{ flexDirection: 'row' }}>
                                        <Input
                                            ref={component => this.commentInput = component}
                                            id={'comment'}
                                            // onFocus={() => this.onFocus()}
                                            name={strings('send.comment')}
                                            type={'OPTIONAL'}
                                            isTextarea={true}
                                            style={{ marginRight: 2, marginHorizontal: 16 }} />
                                    </View> */}

                            {
                                isFioPayment ?
                                    <MemoInput
                                        ref={component => this.memoInput = component}
                                        id={memoInput.id}
                                        disabled={disabled}
                                        name={strings('send.fio_memo')}
                                        type={extendedAddressUiChecker.toUpperCase() + '_DESTINATION_TAG'}
                                        keyboardType={'default'}
                                        info={true}
                                        tabInfo={() => this.modalInfo('FIO')}
                                    /> : null
                            }

                            {(this.state.selectedFee && this.state.useAllFunds) &&
                            <>
                                {this.minerFee()}
                            </>}
                        </View>
                        <TwoButtons
                            mainButton={{
                                disabled: !this.state.amountInputMark,
                                onPress: () => this.handleSendTransaction(false),
                                title: strings('walletBackup.step0Screen.next')
                            }}
                            secondaryButton={{
                                type: 'settings',
                                onPress: this.openAdvancedSettings
                            }}
                        />
                    </ScrollView>
                </KeyboardAwareView>
            </View>

        )
    }

}

SendScreen.contextType = ThemeContext

const mapStateToProps = (state) => {
    return {
        mainStore: state.mainStore,
        send: state.sendStore,
        wallet: state.mainStore.selectedWallet,
        account: state.mainStore.selectedAccount,
        cryptoCurrency: state.mainStore.selectedCryptoCurrency,
        settingsStore: state.settingsStore
    }
}

export default connect(mapStateToProps, {})(SendScreen)

const styles_ = {
    array: ['#f9f9f9', '#f9f9f9'],
    start: { x: 0.0, y: 0 },
    end: { x: 0, y: 1 }
}

const style = {
    line: {
        backgroundColor: '#DADADA',
        height: 1,
        width: '75%',
        alignSelf: 'center',
        marginVertical: 6
    },
    notEquivalentValue: {
        fontFamily: 'SFUIDisplay-Semibold',
        fontSize: 15,
        lineHeight: 19,
        color: '#999999'
    },
    minerFee: {
        fontFamily: 'Montserrat-Medium',
        fontSize: 14,
        lineHeight: 17,
        color: '#5C5C5C'
    },
    currencyFee: {},
    fiatFee: {
        fontFamily: 'Montserrat-Bold',
        fontSize: 12,
        lineHeight: 12
    }
}
