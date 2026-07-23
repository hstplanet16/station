<script setup lang="ts">
import type { IServerStepData } from '~/types/process'
import { processPreviewCtaUi } from '~/utils/processPreviewLayout'

const props = defineProps<{
  data: IServerStepData
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:description': [value: string]
  'update:endpoint': [value: string]
  'update:method': [value: 'GET' | 'POST']
  'update:payload': [value: string]
}>()

const methodItems = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' }
]
</script>

<template>
  <ProcessPreviewShell>
    <UPageCTA orientation="horizontal" variant="naked" class="h-full w-full" :ui="processPreviewCtaUi">
      <template #title>
        <ProcessEditableField
          :model-value="data.title"
          tag="h1"
          class="text-4xl font-semibold"
          :readonly="readonly"
          @update:model-value="emit('update:title', $event)"
        />
      </template>
      <template #description>
        <ProcessEditableField
          :model-value="data.description"
          multiline
          placeholder="İşlem açıklaması..."
          :readonly="readonly"
          @update:model-value="emit('update:description', $event)"
        />
      </template>
      <div class="flex min-h-0 w-full min-w-0 flex-1 items-start justify-center">
        <div class="w-full max-w-lg space-y-4">
          <div v-if="!readonly" class="space-y-3 rounded-lg border border-default p-4">
            <UFormField label="Endpoint">
              <UInput
                :model-value="data.endpoint"
                placeholder="/api/example/action"
                class="w-full"
                @update:model-value="emit('update:endpoint', $event)"
              />
            </UFormField>
            <UFormField label="HTTP Metodu">
              <USelect
                :model-value="data.method"
                :items="methodItems"
                class="w-full"
                @update:model-value="emit('update:method', $event as 'GET' | 'POST')"
              />
            </UFormField>
            <UFormField v-if="data.method === 'POST'" label="Payload (JSON)">
              <UTextarea
                :model-value="data.payload"
                :rows="6"
                class="w-full font-mono text-sm"
                @update:model-value="emit('update:payload', $event)"
              />
            </UFormField>
          </div>

          <UAlert
            v-if="readonly"
            title="Sunucu İşlemi"
            :description="`${data.method} ${data.endpoint || '/api/...'}`"
            variant="subtle"
            icon="i-lucide-server"
          />

          <UAlert
            v-else
            title="Sunucu İşlemi"
            description="Canlı modda bu adım belirtilen endpoint'e istek gönderir ve sonucu bekler."
            variant="subtle"
            icon="i-lucide-server"
          />
        </div>
      </div>
    </UPageCTA>
  </ProcessPreviewShell>
</template>
