<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import { useDeviceStore } from '~/store/Device'

const UAvatar = resolveComponent('UAvatar')
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const deviceStore = useDeviceStore()

const toast = useToast()
const table = useTemplateRef('table')

const columnFilters = ref([{
  id: 'email',
  value: ''
}])

const isConfirmDeleteOpen = ref(false)
const deviceToDelete = ref<any>(null)

const columnVisibility = ref()
const rowSelection = ref()
const editModal = ref(false)

const data = computed(() => {
  return deviceStore.getDevices
})



function getRowItems(row: Row<any>) {
  return [
    {
      type: 'label',
      label: 'Eylemler'
    },
    {
      label: 'Cihazı Düzenle',
      icon: 'material-symbols:open-jam-outline',
      onSelect() {
        rowSelection.value = row.original
        editModal.value = true
      }
    },
    {
      label: 'Bağlan',
      icon: 'material-symbols:open-jam-outline',
      onSelect() {
        const device = localStorage.getItem('next-devices')
        //@ts-ignore
        window.electronAPI.deviceConnection(device).then((response) => {
          console.log("Main process onayladı:", response);
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Cihaz Analizi',
      icon: 'uis:analytics'
    },
    {
      type: 'separator'
    },
    {
      label: 'Cihazı Sil',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        deviceToDelete.value = row.original
        isConfirmDeleteOpen.value = true
      }
    }
  ]
}

const confirmDelete = async () => {
  const device = deviceToDelete.value
  if (!device) return

  isConfirmDeleteOpen.value = false

  // 1) Electron bağlantısını kapatmasını iste
  if (typeof window !== 'undefined' && (window as any).electronAPI?.disconnectDevice) {
    try {
      await (window as any).electronAPI.disconnectDevice(device.connectionType)
    } catch (e) {
      console.warn('Electron cihaz bağlantısı kapatılamadı:', e)
    }
  }

  // 2) Yerel store'dan (ve çerezden) hemen çıkar
  deviceStore.removeDevice(device)

  // 3) Sunucuya silme isteği at
  try {
    await useAxios().delete('Device/removeDevice', { params: { id: device.id } })
    toast.add({
      title: 'Başarılı',
      description: `${device.name} cihazı silindi ve bağlantısı kesildi.`,
      color: 'success'
    })
  } catch (error: any) {
    if (error.isOffline) {
      toast.add({
        title: 'Çevrimdışı',
        description: 'İnternet yok. Cihaz yerel olarak silindi, silme isteği sıraya alındı.',
        color: 'warning'
      })
    } else {
      console.error('Cihaz sunucudan silinirken hata:', error)
      toast.add({
        title: 'Hata',
        description: 'Cihaz sunucudan silinemedi.',
        color: 'error'
      })
    }
  }
}

const columns: TableColumn<any>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          ...{ icon: row.original.icon },
          size: 'lg'
        }),
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted' }, row.original.name),
          h('p', { class: '' }, `@${row.original.connectionType}`)
        ])
      ])
    }
  },
  {
    accessorKey: 'description',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Açıklama',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'connectionType',
    header: 'Bağlantı',
    filterFn: 'equals',
  },
  {
    accessorKey: 'active',
    header: 'Aktif',
    filterFn: 'equals',
    cell: ({ row }) => {
      return h(UBadge, { class: 'capitalize', variant: 'subtle', color: row.original.active ? 'success' : 'warning' }, () =>
        row.original.active ? 'Aktif' : 'Pasif'
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

const statusFilter = ref('all')

watch(() => statusFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const statusColumn = table.value.tableApi.getColumn('connectionType')
  if (!statusColumn) return

  if (newVal === 'all') {
    statusColumn.setFilterValue(undefined)
  } else {
    statusColumn.setFilterValue(newVal)
  }
})

const email = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('email')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('email')?.setFilterValue(value || undefined)
  }
})

onMounted(async () => {
  try {
    await useDeviceStore().getDeviceList()
  } catch (error) {
    useToast().add({ title: "Hata", description: error as string, color: "error" })
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <div v-if="deviceStore.isLoading" class="flex-1 flex items-center justify-center h-full w-full">
    <UIcon name="i-lucide-loader-2" class="animate-spin size-12 text-primary" />
  </div>
  <UDashboardPanel v-else id="customers">
    <template #header>
      <UDashboardNavbar title="Cihazlar">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <CustomersAddModal />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput v-model="email" class="max-w-sm" icon="i-lucide-search" placeholder="Cihaz Ara..." />

        <div class="flex flex-wrap items-center gap-1.5">
          <CustomersDeleteModal :rows="table?.tableApi?.getFilteredSelectedRowModel().rows"
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length">
            <UButton v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length" label="Cihaz Sil" color="error"
              variant="subtle" icon="i-lucide-trash">
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </CustomersDeleteModal>

          <USelect v-model="statusFilter" :items="[
            { label: 'All', value: 'all' },
            { label: 'RS232', value: 'RS232' },
            { label: 'PLC', value: 'PLC' },
            { label: 'TCP', value: 'TCP' },
            { label: 'PC', value: 'PC' }
          ]" :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            placeholder="Filter status" class="min-w-28" />
          <UDropdownMenu :items="table?.tableApi
            ?.getAllColumns()
            .filter((column: any) => column.getCanHide())
            .map((column: any) => ({
              label: upperFirst(column.id),
              type: 'checkbox' as const,
              checked: column.getIsVisible(),
              onUpdateChecked(checked: boolean) {
                table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
              },
              onSelect(e?: Event) {
                e?.preventDefault()
              }
            }))
            " :content="{ align: 'end' }">
            <UButton label="Display" color="neutral" variant="outline" trailing-icon="i-lucide-settings-2" />
          </UDropdownMenu>
        </div>
      </div>

      <UTable ref="table" v-model:column-filters="columnFilters" v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection" v-model:pagination="pagination" :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }" class="shrink-0" :data="data" :columns="columns" :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }" />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)" />
        </div>
      </div>

      <!-- Cihaz Silme Onay Modal'ı -->
      <UModal v-model:open="isConfirmDeleteOpen" title="Cihazı Sil"
        description="Bu cihazı silmek istediğinizden emin misiniz?">
        <template #body>
          <p class="text-sm text-muted mb-4">
            Bu işlem geri alınamaz. <strong>{{ deviceToDelete?.name }}</strong> cihazı silinecek ve varsa aktif
            bağlantısı kesilecektir.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="İptal" variant="ghost" color="neutral" @click="isConfirmDeleteOpen = false" />
            <UButton label="Evet, Sil" color="error" @click="confirmDelete" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
  
  <CustomersEditModal v-model:open="editModal" :data="rowSelection" />
</template>
