/**
 * @author Ksu
 * @version 0.20
 */
import BlocksoftDict from '../common/BlocksoftDict'
import { BlocksoftDictTypes } from '../common/BlocksoftDictTypes'

import BchTransferProcessor from './bch/BchTransferProcessor'
import BsvTransferProcessor from './bsv/BsvTransferProcessor'
import BtcTransferProcessor from './btc/BtcTransferProcessor'
import BtcTestTransferProcessor from './btc_test/BtcTestTransferProcessor'
import BtgTransferProcessor from './btg/BtgTransferProcessor'
import DogeTransferProcessor from './doge/DogeTransferProcessor'
import EthTransferProcessor from './eth/EthTransferProcessor'
import EthTransferProcessorErc20 from './eth/EthTransferProcessorErc20'
import LtcTransferProcessor from './ltc/LtcTransferProcessor'
import TrxTransferProcessor from './trx/TrxTransferProcessor'
import UsdtTransferProcessor from './usdt/UsdtTransferProcessor'
import XrpTransferProcessor from './xrp/XrpTransferProcessor'
import XvgTransferProcessor from './xvg/XvgTransferProcessor'
import EthTransferProcessorUAX from './eth/EthTransferProcessorUAX'
import XmrTransferProcessor from './xmr/XmrTransferProcessor'
import FioTransferProcessor from './fio/FioTransferProcessor'
import { BlocksoftBlockchainTypes } from './BlocksoftBlockchainTypes'

export namespace BlocksoftTransferDispatcher {

    type BlocksoftTransferDispatcherDict = {
        [key in BlocksoftDictTypes.Code]: BlocksoftBlockchainTypes.TransferProcessor
    }

    const CACHE_PROCESSORS : BlocksoftTransferDispatcherDict = {} as BlocksoftTransferDispatcherDict

    export const getTransferProcessor = function(currencyCode: BlocksoftDictTypes.Code): BlocksoftBlockchainTypes.TransferProcessor {
        const currencyDictSettings = BlocksoftDict.getCurrencyAllSettings(currencyCode)
        if (typeof CACHE_PROCESSORS[currencyCode] !== 'undefined') {
            return CACHE_PROCESSORS[currencyCode]
        }
        let transferProcessor = currencyCode
        if (typeof currencyDictSettings.transferProcessor !== 'undefined') {
            transferProcessor = currencyDictSettings.transferProcessor
        }
        switch (transferProcessor) {
            case 'BCH':
                CACHE_PROCESSORS[currencyCode] = new BchTransferProcessor(currencyDictSettings)
                break
            case 'BSV':
                CACHE_PROCESSORS[currencyCode] = new BsvTransferProcessor(currencyDictSettings)
                break
            case 'BTC':
            case 'BTC_SEGWIT':
            case 'BTC_SEGWIT_COMPATIBLE':
                CACHE_PROCESSORS[currencyCode] = new BtcTransferProcessor(currencyDictSettings)
                break
            case 'BTC_TEST':
                CACHE_PROCESSORS[currencyCode] = new BtcTestTransferProcessor(currencyDictSettings)
                break
            case 'BTG':
                CACHE_PROCESSORS[currencyCode] = new BtgTransferProcessor(currencyDictSettings)
                break
            case 'DOGE':
                CACHE_PROCESSORS[currencyCode] = new DogeTransferProcessor(currencyDictSettings)
                break
            case 'ETH':
                CACHE_PROCESSORS[currencyCode] = new EthTransferProcessor(currencyDictSettings)
                break
            case 'ETH_ERC_20':
                CACHE_PROCESSORS[currencyCode] = new EthTransferProcessorErc20(currencyDictSettings)
                break
            case 'ETH_UAX':
                CACHE_PROCESSORS[currencyCode] = new EthTransferProcessorUAX(currencyDictSettings)
                break
            case 'LTC':
                CACHE_PROCESSORS[currencyCode] = new LtcTransferProcessor(currencyDictSettings)
                break
            case 'TRX':
                CACHE_PROCESSORS[currencyCode] = new TrxTransferProcessor(currencyDictSettings)
                break
            case 'USDT':
                CACHE_PROCESSORS[currencyCode] = new UsdtTransferProcessor(currencyDictSettings)
                break
            case 'XRP':
                CACHE_PROCESSORS[currencyCode] = new XrpTransferProcessor(currencyDictSettings)
                break
            case 'XVG':
                CACHE_PROCESSORS[currencyCode] = new XvgTransferProcessor(currencyDictSettings)
                break
            case 'XMR':
                CACHE_PROCESSORS[currencyCode] = new XmrTransferProcessor(currencyDictSettings)
                break
            case 'FIO':
                CACHE_PROCESSORS[currencyCode] = new FioTransferProcessor(currencyDictSettings)
                break
            default:
                throw new Error('Unknown transferProcessor ' + transferProcessor)
        }
        return CACHE_PROCESSORS[currencyCode]
    }
}
