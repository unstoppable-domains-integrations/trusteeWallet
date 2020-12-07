/**
 * @version 0.1
 * @author yura
 */
import React, { Component } from 'react'

import { connect } from 'react-redux'

import { View, ScrollView, Dimensions, Keyboard, Text, TouchableOpacity } from 'react-native'

import { KeyboardAwareView } from 'react-native-keyboard-aware-view'

import { strings } from '../../services/i18n'

import NavStore from '../../components/navigation/NavStore'
import TwoButtons from '../../components/elements/new/buttons/TwoButtons'
import Header from '../../components/elements/new/Header'

import { ThemeContext } from '../../modules/theme/ThemeProvider'

import ListItem from '../../components/elements/new/list/ListItem/Setting'
import SubSetting from '../../components/elements/new/list/ListItem/SubSetting'
import LetterSpacing from '../../components/elements/LetterSpacing'

import BlocksoftPrettyNumbers from '../../../crypto/common/BlocksoftPrettyNumbers'
import BlocksoftDict from '../../../crypto/common/BlocksoftDict'
import BlocksoftUtils from '../../../crypto/common/BlocksoftUtils'
import RateEquivalent from '../../services/UI/RateEquivalent/RateEquivalent'

import AsyncStorage from '@react-native-community/async-storage'

import CustomFee from './elements/FeeCustom/CustomFee'
import { handleFee } from '../../appstores/Stores/Send/SendActions'
import SendTmpConstants from './elements/SendTmpConstants'

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window')

class SendAdvancedSettingsScreen extends Component {

    constructor(props) {
        super(props)
        this.state = {
            focused: false,
            dropMenu: false,
            devMode: false,
            selectedFee: {},
            countedFees: {},
            useAllFunds: false,
            isCustomFee: false,
            selectedFeeFromProps: {}
        }

        this.customFee = React.createRef()
    }

    async UNSAFE_componentWillMount() {

        const devMode = await AsyncStorage.getItem('devMode')
        const data = this.props.navigation.getParam('data')

        // console.log('')
        // console.log('')
        // console.log('Send.SendAdvancedSettings.Unsafe', data)
        this.setState({
            countedFees: data.countedFees,
            selectedFee: data.selectedFee,
            selectedFeeFromProps: data.selectedFee,
            useAllFunds: data.useAllFunds,
            isCustomFee: typeof data.selectedFee.isCustomFee !== 'undefined' ? data.selectedFee.isCustomFee : false,
            devMode: devMode && devMode.toString() === '1'
        })

    }

    toggleDropMenu = () => {
        this.setState({
            dropMenu: !this.state.dropMenu
        })
    }

    setFee = (item) => {
        // console.log('Send.SendAdvancedSettings.setFee', JSON.parse(JSON.stringify({ item })))
        this.setState({
            selectedFee: item,
            isCustomFee: false
        })
    }

    // customFee
    setCustomFee = () => {
        // console.log('Send.SendAdvancedSettings.setCustomFee')
        this.setState({
            isCustomFee: true
        })
        this.scrollView.scrollTo({ y: 120 })
    }

    renderCustomFee = (currencyCode, feesCurrencyCode, basicCurrencySymbol, basicCurrencyRate) => {
        const { countedFees, selectedFee } = this.state
        // console.log('Send.SendAdvancedSettings.renderCustomFee', JSON.parse(JSON.stringify({ currencyCode, feesCurrencyCode, basicCurrencySymbol, basicCurrencyRate })))
        // console.log('Send.SendAdvancedSettings.renderCustomFee state', JSON.parse(JSON.stringify({ countedFees, selectedFee })))
        return (
            <CustomFee
                ref={ref => this.customFee = ref}
                currencyCode={currencyCode}
                useAllFunds={this.state.useAllFunds}
            />
        )
    }

    showFee = (basicCurrencySymbol, feesCurrencyCode, feesCurrencySymbol, feeRates, currencyCode) => {
        const { countedFees, selectedFee, isCustomFee } = this.state
        // console.log('Send.SendAdvancedSettings.showFee', JSON.parse(JSON.stringify({ basicCurrencySymbol, feesCurrencyCode, feesCurrencySymbol, feeRates, currencyCode })))
        // console.log('Send.SendAdvancedSettings.showFee state', JSON.parse(JSON.stringify({ countedFees, selectedFee, isCustomFee })))
        if (!countedFees.fees) {
            // console.log('Send.SendAdvancedSettings.showFee noFees')
            return false
        }

        return (
            <View style={{ paddingHorizontal: 30 }}>
                {
                    countedFees ? countedFees.fees.map((item, index) => {
                        let prettyFee
                        let prettyFeeSymbol = feesCurrencySymbol
                        let feeBasicCurrencySymbol = basicCurrencySymbol
                        let feeBasicAmount = 0

                        const { devMode, selectedFee } = this.state

                        if (typeof item.feeForTxDelegated !== 'undefined') {
                            prettyFeeSymbol = '?' // todo currencySymbol
                            prettyFee = item.feeForTxCurrencyAmount
                            feeBasicAmount = BlocksoftPrettyNumbers.makeCut(item.feeForTxBasicAmount, 5).justCutted
                            feeBasicCurrencySymbol = item.feeForTxBasicSymbol
                        } else {
                            prettyFee = BlocksoftPrettyNumbers.setCurrencyCode(feesCurrencyCode).makePretty(item.feeForTx)
                            feeBasicAmount = BlocksoftPrettyNumbers.makeCut(RateEquivalent.mul({
                                value: prettyFee,
                                currencyCode: feesCurrencyCode,
                                basicCurrencyRate: feeRates.basicCurrencyRate
                            }), 5).justCutted
                            prettyFee = BlocksoftPrettyNumbers.makeCut(prettyFee, 5).justCutted
                        }
                        let devFee = false
                        let needSpeed = item.needSpeed || false
                        if (typeof item.feeForByte !== 'undefined') {
                            devFee = item.feeForByte + ' sat/B '
                            if (needSpeed) {
                                needSpeed = ' rec. ' + needSpeed + ' sat/B'
                            }
                        } else if (typeof item.gasPrice !== 'undefined') {
                            devFee = BlocksoftPrettyNumbers.makeCut(BlocksoftUtils.toGwei(item.gasPrice), 2).justCutted + ' gwei/gas '
                            if (needSpeed) {
                                needSpeed = ' rec. ' + BlocksoftPrettyNumbers.makeCut(BlocksoftUtils.toGwei(needSpeed), 2).justCutted + ' gwei/gas'
                            }
                        }

                        if (!needSpeed) {
                            needSpeed = ''
                        }

                        let subtitle
                        if (item.langMsg === selectedFee.langMsg && !isCustomFee) {
                            subtitle = ` ${prettyFee} ${prettyFeeSymbol}`
                            if (devFee) {
                                subtitle += ` ${devFee}`
                                if (devMode) {
                                    if (!needSpeed) {
                                        needSpeed = ''
                                    }
                                    subtitle += ` ${needSpeed}`
                                }
                            }
                            subtitle += ` / ${feeBasicCurrencySymbol} ${feeBasicAmount}`
                        }

                        return (
                            <SubSetting
                                title={strings(`send.fee.text.${item.langMsg}`)}
                                subtitle={subtitle}
                                checked={(item.langMsg === selectedFee.langMsg) && !isCustomFee}
                                radioButtonFirst={true}
                                withoutLine={true}
                                onPress={() => this.setFee(item)}
                                checkedStyle={true}
                            />
                        )
                    }).reverse() : <View></View>

                }
                {countedFees && (
                    <SubSetting
                        title={strings(`send.fee.customFee.title`)}
                        checked={isCustomFee}
                        radioButtonFirst={true}
                        withoutLine={true}
                        onPress={() => this.setCustomFee()}
                        checkedStyle={true}
                        ExtraView={() => this.renderCustomFee(currencyCode, feesCurrencyCode, basicCurrencySymbol, feeRates.basicCurrencyRate)}
                    />
                )}
            </View>
        )
    }

    disabled = () => {
        return this.state.selectedFee === this.state.selectedFeeFromProps
    }

    handleApply = async () => {
        const countedFees = this.state.countedFees
        countedFees.selectedFeeIndex = this.state.selectedIndex

        let selectedFee = this.state.selectedFee
        if (this.state.isCustomFee) {
            selectedFee = await this.customFee.handleGetCustomFee()
        }

        SendTmpConstants.PRESET = true
        SendTmpConstants.COUNTED_FEES = countedFees
        SendTmpConstants.SELECTED_FEE = selectedFee
        NavStore.goBack()
    }

    onFocus = () => {
        // console.log('hello')
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

    render() {

        const { colors, GRID_SIZE } = this.context

        const {
            focused,
        } = this.state

        const { basicCurrencySymbol, feesCurrencyCode, feesCurrencySymbol, feeRates } = this.props.account
        const { currencyCode } = this.props.cryptoCurrency

        return (
            <View style={{ flex: 1, backgroundColor: colors.common.background }}>
                <Header
                    title={strings('send.setting.title')}
                />
                <KeyboardAwareView>
                    <ScrollView
                        ref={(ref) => {
                            this.scrollView = ref
                        }}
                        keyboardShouldPersistTaps={'handled'}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', padding: GRID_SIZE, paddingBottom: GRID_SIZE * 2, minHeight: focused ? 400 : WINDOW_HEIGHT/2 }}
                        style={{ marginTop: 70 }}
                    >
                        <View style={{ paddingHorizontal: GRID_SIZE, paddingTop: GRID_SIZE * 1.5 }}>
                            <LetterSpacing text={strings('account.assetSettings').toUpperCase()} textStyle={styles.settings__title} letterSpacing={1.5} />
                            <ListItem
                                title={'Fee select'}
                                iconType="pinCode"
                                onPress={this.toggleDropMenu}
                                rightContent={this.state.dropMenu ? 'arrow_up' : "arrow_down"}
                                switchParams={{ value: !!this.state.dropMenu, onPress: this.toggleDropMenu }}
                                type={'dropdown'}
                                ExtraView={() => this.showFee(basicCurrencySymbol, feesCurrencyCode, feesCurrencySymbol, feeRates, currencyCode)}
                                subtitle={'FEE'}
                            />
                        </View>
                        <TwoButtons
                            mainButton={{
                                disabled: this.disabled(),
                                onPress: () => this.handleApply(),
                                title: strings('walletBackup.step0Screen.next')
                            }}
                            secondaryButton={{
                                type: 'back',
                                onPress: () => NavStore.goBack(),
                            }}
                        />
                    </ScrollView>
                </KeyboardAwareView>
            </View>
        )
    }
}

SendAdvancedSettingsScreen.contextType = ThemeContext

const mapStateToProps = (state) => {
    return {
        mainStore: state.mainStore,
        cryptoCurrency: state.mainStore.selectedCryptoCurrency,
        account: state.mainStore.selectedAccount,
        sendStore: state.sendStore
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SendAdvancedSettingsScreen)

const styles = {
    settings__title: {
        fontFamily: 'SFUIDisplay-Semibold',
        fontSize: 12,
        color: '#404040'
    },
}