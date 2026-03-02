"""
Custom exception handler that returns consistent JSON error responses.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """
    Standardize DRF exception responses.
    Returns: { "error": True, "status_code": 400, "detail": ... }
    'detail' can be a string, a list of strings, or an object (for field validation).
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Extract code if available (DRF adds .code to detail items)
        code = 'error'
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                # If it's a dict, we might just take the first code or 'validation_error'
                code = 'validation_error'
            elif hasattr(exc.detail, 'code'):
                code = exc.detail.code

        response.data = {
            'error': True,
            'status_code': response.status_code,
            'code': code,
            'detail': response.data
        }

    return response
