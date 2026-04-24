"""
app/api/webhooks.py
-------------------
Endpoints para webhooks de servicios externos (MercadoPago, PayPal, etc.).
"""

from fastapi import APIRouter, Request

from app.services import payment as payment_service
from app.services import subscription as subscription_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/mercadopago")
async def mercadopago_webhook(request: Request):
    """
    Webhook que MercadoPago llama cuando hay actualizaciones.
    
    Maneja:
    - Pagos únicos (type: "payment")
    - Suscripciones (action: "subscription.preapproval_plan.*")
    - Cobros de suscripciones (type: "payment" + preapproval_id)
    """
    try:
        # Obtener el body del webhook
        body = await request.json()
        
        print("=" * 80)
        print("WEBHOOK RECIBIDO DE MERCADOPAGO:")
        print(f"Body completo: {body}")
        print("=" * 80)
        
        # ──────────────────────────────────────────────────────────────────────
        # CASO 1: Notificación de tipo "payment" (pagos únicos o cobros de suscripción)
        # ──────────────────────────────────────────────────────────────────────
        if body.get("type") == "payment":
            payment_id = body.get("data", {}).get("id")
            
            print(f"Payment ID extraído: {payment_id}")
            
            if not payment_id:
                print("ERROR: No payment ID in webhook")
                return {
                    "status": "error",
                    "message": "No payment ID in webhook"
                }
            
            # Procesar el pago
            print(f"Llamando a process_payment_webhook con ID: {payment_id}")
            result = payment_service.process_payment_webhook(str(payment_id))
            print(f"Resultado del procesamiento: {result}")
            
            return {
                "status": "success",
                "result": result
            }
        
        # ──────────────────────────────────────────────────────────────────────
        # CASO 2: Notificación de suscripción (authorized, paused, cancelled)
        # ──────────────────────────────────────────────────────────────────────
        action = body.get("action", "")
        
        if "subscription" in action or "preapproval" in action:
            preapproval_id = body.get("data", {}).get("id")
            
            print(f"Preapproval ID extraído: {preapproval_id}")
            
            if not preapproval_id:
                print("ERROR: No preapproval ID in webhook")
                return {
                    "status": "error",
                    "message": "No preapproval ID in webhook"
                }
            
            # Procesar la suscripción
            print(f"Llamando a process_subscription_webhook con ID: {preapproval_id}")
            result = subscription_service.process_subscription_webhook(str(preapproval_id))
            print(f"Resultado del procesamiento: {result}")
            
            return {
                "status": "success",
                "result": result
            }
        
        # ──────────────────────────────────────────────────────────────────────
        # Otros tipos de notificaciones (merchant_order, etc.)
        # ──────────────────────────────────────────────────────────────────────
        print(f"Tipo de webhook ignorado: type={body.get('type')}, action={action}")
        return {
            "status": "ignored",
            "message": f"Webhook type '{body.get('type')}' not processed"
        }
        
    except Exception as e:
        print("=" * 80)
        print(f"ERROR PROCESANDO WEBHOOK: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 80)
        # Importante: retornar 200 OK aunque haya error
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/mercadopago/test")
def test_webhook():
    """
    Endpoint de prueba para verificar que el webhook está accesible.
    """
    return {
        "status": "ok",
        "message": "Webhook endpoint is working"
    }