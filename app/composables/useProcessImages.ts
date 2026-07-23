const IMAGE_PREFIX = 'next-process-image-'
const IMAGE_MAPPING_PREFIX = 'next-image-mapping-'

interface ImageMapping {
  imageId: string
  serverImageUrl?: string | null
  uploaded: boolean
}

export function useProcessImages() {
  const { saveImage: saveToLocal, getImage: getFromLocal, deleteImage: deleteFromLocal } = useLocalStorageImages()
  const { uploadToServer, downloadFromServer } = useServerImages()

  async function saveImage(imageId: string, dataUrl: string): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const serverImageUrl = await uploadToServer(imageId, dataUrl)
      
      saveToLocal(imageId, dataUrl)
      
      saveImageMapping(imageId, {
        imageId,
        serverImageUrl,
        uploaded: !!serverImageUrl
      })
    } catch (error) {
      console.error('Sunucuya yükleme hatası, sadece local kaydediliyor:', error)
      saveToLocal(imageId, dataUrl)
      saveImageMapping(imageId, {
        imageId,
        uploaded: false
      })
    }
  }

  async function getImage(imageId: string): Promise<string | null> {
    if (typeof window === 'undefined') return null

    const localImage = getFromLocal(imageId)
    if (localImage) {
      return localImage
    }

    const mapping = getImageMapping(imageId)
    if (mapping?.serverImageUrl) {
      try {
        const serverImage = await downloadFromServer(mapping.serverImageUrl)
        if (serverImage) {
          saveToLocal(imageId, serverImage)
          return serverImage
        }
      } catch (error) {
        console.error('Sunucudan indirme hatası:', error)
      }
    }

    return null
  }

  function deleteImage(imageId: string) {
    if (typeof window === 'undefined') return
    deleteFromLocal(imageId)
    localStorage.removeItem(`${IMAGE_MAPPING_PREFIX}${imageId}`)
  }

  function deleteImages(imageIds: string[]) {
    imageIds.forEach(deleteImage)
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function saveImageMapping(imageId: string, mapping: ImageMapping) {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${IMAGE_MAPPING_PREFIX}${imageId}`, JSON.stringify(mapping))
  }

  function getImageMapping(imageId: string): ImageMapping | null {
    if (typeof window === 'undefined') return null
    const mapping = localStorage.getItem(`${IMAGE_MAPPING_PREFIX}${imageId}`)
    return mapping ? JSON.parse(mapping) : null
  }

  return { saveImage, getImage, deleteImage, deleteImages, readFileAsDataUrl }
}

function useLocalStorageImages() {
  const IMAGE_PREFIX = 'next-process-image-'

  function saveImage(imageId: string, dataUrl: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${IMAGE_PREFIX}${imageId}`, dataUrl)
  }

  function getImage(imageId: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${IMAGE_PREFIX}${imageId}`)
  }

  function deleteImage(imageId: string) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${IMAGE_PREFIX}${imageId}`)
  }

  return { saveImage, getImage, deleteImage }
}

function useServerImages() {
  async function uploadToServer(imageId: string, dataUrl: string): Promise<string | null> {
    try {
      const axios = (await import('axios')).default
      const formData = new FormData()
      
      const blob = dataUrlToBlob(dataUrl)
      formData.append('file', blob, `${imageId}.png`)

      const response = await axios.post('/api/Files/uploadImage', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      return response.data?.url || null
    } catch (error) {
      console.error('Sunucu yükleme hatası:', error)
      return null
    }
  }

  async function downloadFromServer(serverImageUrl: string): Promise<string | null> {
    try {
      const axios = (await import('axios')).default
      
      // URL'den dosya adını çıkar
      const urlParts = serverImageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      const response = await axios.get(`/api/Files/download/${fileName}`, {
        responseType: 'arraybuffer'
      })

      const blob = new Blob([response.data], { type: 'image/png' })
      return blobToDataUrl(blob)
    } catch (error) {
      console.error('Sunucu indirme hatası:', error)
      return null
    }
  }

  return { uploadToServer, downloadFromServer }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',')
  const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = arr[1] ? atob(arr[1]) : ''
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
