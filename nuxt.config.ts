// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@pinia/nuxt'
  ],

  icon: {
    serverBundle: false,
    clientBundle: {
      scan: true,
      icons: [
        'material-symbols:barcode-reader-outline-sharp',
        'ph:screwdriver',
        'material-symbols:android-camera-outline',
        'material-symbols:keyboard-alt-outline-sharp',
        'material-symbols:device-hub-outline',
        'material-symbols:warning-rounded',
        'material-symbols:lock-open-circle',
        'material-symbols:developer-mode',
        'material-symbols:open-jam-outline',
        'material-symbols:analytics-outline',
        'material-symbols:bolt',
        'material-symbols:cancel',
        'material-symbols:database',
        'mdi:screw-machine-flat-top',
        'solar:smartphone-rotate-angle-bold-duotone',
        'lucide:loader-2',
        'lucide:triangle-alert',
        'lucide:x-circle',
        'lucide:trash-2',
        'lucide:trash',
        'lucide:bell-off',
        'lucide:chevron-right',
        'lucide:file-text',
        'lucide:info',
        'lucide:plus',
        'lucide:scan-barcode',
        'lucide:check-circle',
        'lucide:alert-circle',
        'lucide:pencil',
        'lucide:upload',
        'lucide:barcode',
        'lucide:timer',
        'lucide:refresh-cw',
        'lucide:terminal',
        'lucide:server',
        'lucide:circle-plus',
        'lucide:cog',
        'lucide:chevrons-up-down',
        'lucide:user',
        'lucide:settings',
        'lucide:palette',
        'lucide:sun-moon',
        'lucide:log-out',
        'lucide:book-open',
        'lucide:ellipsis-vertical',
        'lucide:search',
        'lucide:settings-2',
        'lucide:eye',
        'lucide:eye-off',
        'lucide:loader-circle',
        'lucide:arrow-right',
        'lucide:arrow-left',
        'lucide:arrow-up-down',
        'lucide:arrow-up-narrow-wide',
        'lucide:arrow-down-wide-narrow'
      ]
    },
    fallbackToApi: false
  },

  devtools: {
    enabled: true
  },
  ssr: false,

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})