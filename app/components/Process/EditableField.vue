<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'span'
  multiline?: boolean
  placeholder?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editing = ref(false)
const skipCommit = ref(false)
const localValue = ref(props.modelValue)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

watch(() => props.modelValue, (val) => {
  if (!editing.value) localValue.value = val
})

function cancelEdit() {
  if (!editing.value) return
  localValue.value = props.modelValue
  skipCommit.value = true
  editing.value = false
  inputRef.value?.blur()
}

function startEdit() {
  if (props.readonly) return
  localValue.value = props.modelValue
  editing.value = true
  nextTick(() => inputRef.value?.focus())
}

function commit() {
  if (skipCommit.value) {
    skipCommit.value = false
    return
  }

  editing.value = false
  if (localValue.value !== props.modelValue) {
    emit('update:modelValue', localValue.value)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelEdit()
    e.preventDefault()
    e.stopPropagation()
    return
  }

  if (!props.multiline && e.key === 'Enter') {
    commit()
  }
}

useGlobalEditCancel(cancelEdit, editing)
</script>

<template>
  <div class="group relative">
    <component
      :is="tag ?? 'p'"
      v-if="!editing"
      class="rounded px-1 -mx-1"
      :class="[
        { 'whitespace-pre-wrap': multiline },
        readonly ? '' : 'cursor-pointer hover:bg-primary/10 transition-colors group'
      ]"
      @click="startEdit"
    >
      <slot>{{ modelValue }}</slot>
      <UIcon
        v-if="!readonly"
        name="i-lucide-pencil"
        class="inline-block ml-1 size-3 opacity-0 group-hover:opacity-50"
      />
    </component>

    <UTextarea
      v-else-if="multiline"
      ref="inputRef"
      v-model="localValue"
      :rows="3"
      class="w-full"
      :placeholder="placeholder"
      @blur="commit"
      @keydown="onKeydown"
    />
    <UInput
      v-else
      ref="inputRef"
      v-model="localValue"
      class="w-full"
      :placeholder="placeholder"
      @blur="commit"
      @keydown="onKeydown"
    />
  </div>
</template>
