"""
app/api/webhooks.py
-------------------
Endpoints para webhooks de servicios externos (MercadoPago, PayPal, etc.).

IMPORTANTE: Estos endpoints NO requieren autenticación JWT.
Son llamados directamente por los servicios de pago.
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.services import payment as payment_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/mercadopago")
async def mercadopago_webhook(request: Request):
    """
    Webhook que MercadoPago llama cuando hay una actualización de pago.
    """
    try:
        # Obtener el body del webhook
        body = await request.json()
        
        print("=" * 80)
        print("WEBHOOK RECIBIDO DE MERCADOPAGO:")
        print(f"Body completo: {body}")
        print("=" * 80)
        
        # MercadoPago envía diferentes tipos de notificaciones
        # Nos interesan las de tipo "payment"
        if body.get("type") == "payment":
            # Obtener el ID del pago desde el webhook
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
        
        # Otros tipos de notificaciones
        print(f"Tipo de webhook ignorado: {body.get('type')}")
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
    
    Útil para testing local con ngrok.
    """
    return {
        "status": "ok",
        "message": "Webhook endpoint is working"
    }