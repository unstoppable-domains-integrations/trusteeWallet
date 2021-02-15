/**
 * @version 0.5
 * https://github.com/tronscan/tronscan-frontend/wiki/TRONSCAN-API
 */
import BlocksoftCryptoLog from '../../../common/BlocksoftCryptoLog'
import BlocksoftAxios from '../../../common/BlocksoftAxios'

const BALANCE_PATH = 'https://api.trongrid.io/walletsolidity/getaccount?address='
const BALANCE_MAX_TRY = 10

const CACHE_TRONGRID = {}
const CACHE_VALID_TIME = 3000 // 3 seconds

export default class TrxTrongridProvider {

    /**
     * https://api.trongrid.io/walletsolidity/getaccount?address=41d4eead2ea047881ce54cae1a765dfe92a8bfdbe9
     * @param {string} address
     * @param {string} tokenName
     * @returns {Promise<boolean|{unconfirmed: number, frozen: *, frozenEnergy:*, voteTotal: *, balance: *, provider: string}>}
     */
    async get(address, tokenName) {
        const now = new Date().getTime()
        if (typeof CACHE_TRONGRID[address] !== 'undefined' && (now - CACHE_TRONGRID[address].time) < CACHE_VALID_TIME) {
            if (typeof CACHE_TRONGRID[address][tokenName] !== 'undefined') {
                BlocksoftCryptoLog.log('TrxTrongridProvider.get from cache', address + ' => ' + tokenName + ' : ' + CACHE_TRONGRID[address][tokenName])
                const voteTotal = typeof CACHE_TRONGRID[address].voteTotal !== 'undefined' ? CACHE_TRONGRID[address].voteTotal : 0
                const frozen = typeof CACHE_TRONGRID[address][tokenName + 'frozen'] !== 'undefined' ? CACHE_TRONGRID[address][tokenName + 'frozen'] : 0
                const frozenEnergy = typeof CACHE_TRONGRID[address][tokenName + 'frozenEnergy'] !== 'undefined' ? CACHE_TRONGRID[address][tokenName + 'frozenEnergy'] : 0
                return { balance: CACHE_TRONGRID[address][tokenName], voteTotal, frozen, frozenEnergy, unconfirmed: 0, provider: 'trongrid-cache' }
            } else if (tokenName !== '_') {
                return { balance: 0, unconfirmed : 0, provider: 'trongrid-cache' }
            }
        }

        const link = BALANCE_PATH + address
        BlocksoftCryptoLog.log('TrxTrongridProvider.get ' + link)
        const res = await BlocksoftAxios.getWithoutBraking(link, BALANCE_MAX_TRY)
        if (!res || !res.data) {
            return false
        }

        CACHE_TRONGRID[address] = {}
        CACHE_TRONGRID[address].time = now
        CACHE_TRONGRID[address]._ = typeof res.data.balance !== 'undefined' ? res.data.balance : 0
        CACHE_TRONGRID[address]._frozen = typeof res.data.frozen !== 'undefined' && typeof res.data.frozen[0] !== 'undefined' ? res.data.frozen[0].frozen_balance : 0
        CACHE_TRONGRID[address]._frozenEnergy = typeof res.data.account_resource !== 'undefined'
                                            && typeof res.data.account_resource.frozen_balance_for_energy !== 'undefined'
                                            && typeof res.data.account_resource.frozen_balance_for_energy.frozen_balance !== 'undefined'
                                                ? res.data.account_resource.frozen_balance_for_energy.frozen_balance : 0
        CACHE_TRONGRID[address].voteTotal = typeof res.data.votes !== 'undefined' && typeof res.data.votes[0] !== 'undefined' ? res.data.votes[0].vote_count : 0

        if (res.data.assetV2) {
            let token
            for (token of res.data.assetV2) {
                CACHE_TRONGRID[address][token.key] = token.value
            }
        }

        if (typeof CACHE_TRONGRID[address][tokenName] === 'undefined') {
            return { balance: 0, unconfirmed : 0, provider: 'trongrid' }
        }

        const balance = CACHE_TRONGRID[address][tokenName]
        const frozen = typeof CACHE_TRONGRID[address][tokenName + 'frozen'] !== 'undefined' ? CACHE_TRONGRID[address][tokenName + 'frozen'] : 0
        const frozenEnergy = typeof CACHE_TRONGRID[address][tokenName + 'frozenEnergy'] !== 'undefined' ? CACHE_TRONGRID[address][tokenName + 'frozenEnergy'] : 0
        const voteTotal = typeof CACHE_TRONGRID[address].voteTotal !== 'undefined' ? CACHE_TRONGRID[address].voteTotal : 0
        return { balance, voteTotal, frozen, frozenEnergy, unconfirmed: 0, provider: 'trongrid' }
    }
}
