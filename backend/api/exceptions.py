"""
Custom exception handler that returns consistent JSON error responses.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """
    Wrap DRF's default exception handler to return a standardized
    { "error": "...", "detail": ... } structure.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_detail = response.data
        # Flatten single-key dict {"detail": "..."} for convenience
        if isinstance(error_detail, dict) and list(error_detail.keys()) == ['detail']:
            error_detail = str(error_detail['detail'])

        response.data = {
            'error': True,
            'status_code': response.status_code,
            'detail': error_detail,
        }

    return response
