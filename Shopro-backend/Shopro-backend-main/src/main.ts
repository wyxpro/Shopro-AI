import {type Component, createApp} from 'vue'
import {createPinia} from 'pinia'
import {ElAlert} from 'element-plus/es/components/alert/index.mjs'
import {ElAside, ElContainer, ElHeader, ElMain} from 'element-plus/es/components/container/index.mjs'
import {ElAutocomplete} from 'element-plus/es/components/autocomplete/index.mjs'
import {ElButton} from 'element-plus/es/components/button/index.mjs'
import {ElDatePicker} from 'element-plus/es/components/date-picker/index.mjs'
import {ElDescriptions, ElDescriptionsItem} from 'element-plus/es/components/descriptions/index.mjs'
import {ElDialog} from 'element-plus/es/components/dialog/index.mjs'
import {ElDivider} from 'element-plus/es/components/divider/index.mjs'
import {ElDrawer} from 'element-plus/es/components/drawer/index.mjs'
import {ElEmpty} from 'element-plus/es/components/empty/index.mjs'
import {ElForm, ElFormItem} from 'element-plus/es/components/form/index.mjs'
import {ElIcon} from 'element-plus/es/components/icon/index.mjs'
import {ElImage} from 'element-plus/es/components/image/index.mjs'
import {ElInput} from 'element-plus/es/components/input/index.mjs'
import {ElInputNumber} from 'element-plus/es/components/input-number/index.mjs'
import {ElMenu, ElMenuItem} from 'element-plus/es/components/menu/index.mjs'
import {ElOption, ElSelect} from 'element-plus/es/components/select/index.mjs'
import {ElPagination} from 'element-plus/es/components/pagination/index.mjs'
import {ElProgress} from 'element-plus/es/components/progress/index.mjs'
import {ElRadio, ElRadioButton, ElRadioGroup} from 'element-plus/es/components/radio/index.mjs'
import {ElSwitch} from 'element-plus/es/components/switch/index.mjs'
import {ElTable, ElTableColumn} from 'element-plus/es/components/table/index.mjs'
import {ElTabPane, ElTabs} from 'element-plus/es/components/tabs/index.mjs'
import {ElTag} from 'element-plus/es/components/tag/index.mjs'
import {ElTimeline, ElTimelineItem} from 'element-plus/es/components/timeline/index.mjs'
import {ElTooltip} from 'element-plus/es/components/tooltip/index.mjs'
import 'element-plus/es/components/alert/style/css'
import 'element-plus/es/components/autocomplete/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/container/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/descriptions/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/divider/style/css'
import 'element-plus/es/components/drawer/style/css'
import 'element-plus/es/components/empty/style/css'
import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/image/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/menu/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/progress/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/table/style/css'
import 'element-plus/es/components/tabs/style/css'
import 'element-plus/es/components/tag/style/css'
import 'element-plus/es/components/timeline/style/css'
import 'element-plus/es/components/tooltip/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './style.css'
import App from './App.vue'
import router from './router'

async function boot() {
    const appMode = import.meta.env.VITE_APP_MODE || 'demo'
    if (appMode !== 'production' && import.meta.env.VITE_USE_MOCK !== 'false') {
        const {worker} = await import('./mocks/browser')
        await worker.start({onUnhandledRequest: 'bypass'})
    }

    const app = createApp(App).use(createPinia()).use(router)
    ;([
        ['ElAlert', ElAlert], ['ElAside', ElAside], ['ElAutocomplete', ElAutocomplete], ['ElButton', ElButton],
        ['ElContainer', ElContainer], ['ElDatePicker', ElDatePicker], ['ElDescriptions', ElDescriptions], ['ElDescriptionsItem', ElDescriptionsItem],
        ['ElDialog', ElDialog], ['ElDivider', ElDivider], ['ElDrawer', ElDrawer], ['ElEmpty', ElEmpty],
        ['ElForm', ElForm], ['ElFormItem', ElFormItem], ['ElHeader', ElHeader], ['ElIcon', ElIcon],
        ['ElImage', ElImage], ['ElInput', ElInput], ['ElInputNumber', ElInputNumber], ['ElMain', ElMain],
        ['ElMenu', ElMenu], ['ElMenuItem', ElMenuItem], ['ElOption', ElOption], ['ElPagination', ElPagination],
        ['ElProgress', ElProgress], ['ElRadio', ElRadio], ['ElRadioButton', ElRadioButton], ['ElRadioGroup', ElRadioGroup],
        ['ElSelect', ElSelect], ['ElSwitch', ElSwitch], ['ElTabPane', ElTabPane], ['ElTable', ElTable],
        ['ElTableColumn', ElTableColumn], ['ElTabs', ElTabs], ['ElTag', ElTag], ['ElTimeline', ElTimeline],
        ['ElTimelineItem', ElTimelineItem], ['ElTooltip', ElTooltip],
    ] as [string, Component][]).forEach(([name, component]) => app.component(name, component))
    app.mount('#app')
}

boot()
