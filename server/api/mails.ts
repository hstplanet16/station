import { sub } from 'date-fns'

const mails = [
  {
  id: 1,
  name : "BCM Okutma",
  processType : "Barkod Okutma",
  processNumber: 100,
}, 
{
  id: 2,
  pasif: true,
  name : "BCM Montajı",
  processType : "Yönlendirme",
  processNumber: 200,
}]

export default eventHandler(async () => {
  return mails
})
