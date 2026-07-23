const plcData = ref(null);
const isConnected = ref(false);
const isWriting = ref(false);
const lastError = ref(null);
let listenersRegistered = false;

function registerListenersOnce() {
  if (listenersRegistered) return;
  if (!import.meta.client || !(window as any).electronAPI) return;

  listenersRegistered = true;

  (window as any).electronAPI.plcStream((data: any) => {
    plcData.value = data;
  });

  (window as any).electronAPI.onPlcStatus((status: any) => {
    isConnected.value = status;
  });
}

export const usePLC = () => {

  registerListenersOnce()


  const writeValue = async (variableName: string, value: any) => {
    isWriting.value = true;
    lastError.value = null;
    try {
      const result = await (window as any).electronAPI.plcWrite(variableName, value);
      if (!result.success) {
        lastError.value = result.error;
      }
      return result;
    } finally {
      isWriting.value = false;
    }
  };

  // Toplu yazma
  // örnek: writeMultiple({ VIN: 'WBA...', Sikma_Adedi: 4, Calisma_Izni: true })
  const writeMultiple = async (dataObject: any) => {
    isWriting.value = true;
    lastError.value = null;
    try {
      const result = await (window as any).electronAPI.plcWriteMultiple(dataObject);
      if (!result.success) {
        lastError.value = result.error;
      }
      return result;
    } finally {
      isWriting.value = false;
    }
  };

  return {
    plcData,
    isConnected,
    isWriting,
    lastError,
    writeValue,
    writeMultiple
  };
}
