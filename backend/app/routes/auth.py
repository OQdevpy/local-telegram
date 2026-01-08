from fastapi import APIRouter, HTTPException
from app.telegram_client import telegram_manager
from app.models.schemas import (
    SendCodeRequest,
    SendCodeResponse,
    SignInRequest,
    SignInResponse,
    RestoreSessionRequest
)

router = APIRouter(tags=["auth"])


@router.post("/send-code", response_model=SendCodeResponse)
async def send_code(request: SendCodeRequest):
    """Send verification code to phone number"""
    try:
        session_id, client = await telegram_manager.create_client()
        phone_code_hash = await telegram_manager.send_code(session_id, request.phone)
        return SendCodeResponse(
            phone_code_hash=phone_code_hash,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sign-in", response_model=SignInResponse)
async def sign_in(request: SignInRequest):
    """Sign in with verification code"""
    try:
        success, session_string, user_data = await telegram_manager.sign_in(
            session_id=request.session_id,
            phone=request.phone,
            code=request.code,
            phone_code_hash=request.phone_code_hash,
            password=request.password
        )

        if not success and user_data.get("needs_2fa"):
            return SignInResponse(
                success=False,
                needs_2fa=True
            )

        return SignInResponse(
            success=True,
            session_string=session_string,
            user=user_data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sign-in-2fa", response_model=SignInResponse)
async def sign_in_2fa(session_id: str, password: str):
    """Complete 2FA sign in"""
    try:
        session_string, user_data = await telegram_manager.sign_in_2fa(
            session_id=session_id,
            password=password
        )
        return SignInResponse(
            success=True,
            session_string=session_string,
            user=user_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/restore-session")
async def restore_session(request: RestoreSessionRequest):
    """Restore session from saved session string"""
    try:
        session_id, user_data = await telegram_manager.restore_session(
            request.session_string
        )
        return {
            "success": True,
            "session_id": session_id,
            "user": user_data
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(session_id: str):
    """Logout and cleanup session"""
    try:
        await telegram_manager.logout(session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
async def get_me(session_id: str):
    """Get current user info"""
    try:
        client = telegram_manager.get_client(session_id)
        if not client:
            raise HTTPException(status_code=401, detail="Session not found")

        me = await client.get_me()
        return telegram_manager._format_user(me)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
