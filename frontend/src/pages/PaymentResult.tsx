import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentsApi } from '@/api/payments'

interface Props {
  result: 'success' | 'failure' | 'pending'
}

export function PaymentResult({ result }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const preferenceId = searchParams.get('preference_id')
    // MP sends payment_id in both collection_id and payment_id params
    const mpPaymentId = searchParams.get('collection_id') || searchParams.get('payment_id')
    const returnUrl = sessionStorage.getItem('mp_return_url') || '/'
    sessionStorage.removeItem('mp_return_url')

    if (result === 'success' && mpPaymentId && mpPaymentId !== 'null') {
      // Process the payment immediately — don't wait for the webhook
      paymentsApi
        .confirmSuccess(mpPaymentId)
        .catch(() => {})
        .finally(() => navigate('/dashboard', { replace: true }))
      return
    }

    if (result === 'success') {
      navigate('/dashboard', { replace: true })
      return
    }

    // failure / pending: cancel the pending payment and go back to course
    if (preferenceId && preferenceId !== 'null') {
      paymentsApi.cancelByPreference(preferenceId).catch(() => {})
    }
    navigate(returnUrl, { replace: true })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          {result === 'success' ? 'Procesando tu compra…' : 'Redirigiendo…'}
        </p>
      </div>
    </div>
  )
}
