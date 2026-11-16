package com.vinyas.urlshortener.exception;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.vinyas.urlshortener.component.CreateRateLimiter;
import com.vinyas.urlshortener.component.TraceIdFilter;
import com.vinyas.urlshortener.dto.ErrorResponse;
import com.vinyas.urlshortener.dto.FieldValidationError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return buildResponse(ex.getStatus(), ex.getCode(), ex.getMessage(), request, List.of(), ex);
    }

    @ExceptionHandler(RateLimitedException.class)
    public ResponseEntity<ErrorResponse> handleRateLimited(
            RateLimitedException ex, HttpServletRequest request) {
        ResponseEntity<ErrorResponse> response = buildResponse(
                ex.getStatus(), ex.getCode(), ex.getMessage(), request, List.of(), ex);
        response.getHeaders().set(HttpHeaders.RETRY_AFTER, Long.toString(ex.getRetryAfterSeconds()));
        response.getHeaders().set(CreateRateLimiter.LIMIT_HEADER, Integer.toString(ex.getLimit()));
        response.getHeaders().set(CreateRateLimiter.REMAINING_HEADER, "0");
        return response;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<FieldValidationError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldValidationError(error.getField(), error.getDefaultMessage()))
                .toList();
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Request validation failed",
                request,
                fieldErrors,
                ex);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        List<FieldValidationError> fieldErrors = ex.getConstraintViolations().stream()
                .map(violation -> new FieldValidationError(
                        violation.getPropertyPath().toString(), violation.getMessage()))
                .toList();
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Request validation failed",
                request,
                fieldErrors,
                ex);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "MALFORMED_JSON",
                "Request body is missing or malformed",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        ResponseEntity<ErrorResponse> response = buildResponse(
                HttpStatus.METHOD_NOT_ALLOWED,
                "METHOD_NOT_ALLOWED",
                "HTTP method is not supported for this endpoint",
                request,
                List.of(),
                ex);
        if (ex.getSupportedHttpMethods() != null) {
            response.getHeaders().setAllow(ex.getSupportedHttpMethods());
        }
        return response;
    }

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleNoRoute(Exception ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.NOT_FOUND,
                "ROUTE_NOT_FOUND",
                "No route matches the requested path",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.CONFLICT,
                "CONSTRAINT_VIOLATION",
                "Request violates a database constraint",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccess(DataAccessException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                "SERVICE_UNAVAILABLE",
                "Database is temporarily unavailable",
                request,
                List.of(),
                ex);
    }

    /**
     * A connection cannot be acquired to begin a transaction, which is the usual shape of a
     * database outage for a repository call. It is not a {@link DataAccessException}, so it needs
     * its own mapping to keep the outage contract at 503.
     */
    @ExceptionHandler(CannotCreateTransactionException.class)
    public ResponseEntity<ErrorResponse> handleCannotCreateTransaction(
            CannotCreateTransactionException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                "SERVICE_UNAVAILABLE",
                "Database is temporarily unavailable",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_MEDIA_TYPE",
                "Content-Type is not supported",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ErrorResponse> handleNotAcceptable(
            HttpMediaTypeNotAcceptableException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.NOT_ACCEPTABLE,
                "NOT_ACCEPTABLE",
                "Requested response media type is not available",
                request,
                List.of(),
                ex);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Required request parameter is missing",
                request,
                List.of(new FieldValidationError(ex.getParameterName(), "is required")),
                ex);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Request parameter has an invalid value",
                request,
                List.of(new FieldValidationError(ex.getName(), "has an invalid value")),
                ex);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                request,
                List.of(),
                ex);
    }

    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<FieldValidationError> fieldErrors,
            Throwable exception) {
        String traceId = currentTraceId(request);
        if (status.is5xxServerError()) {
            log.error("Request failed: status={} code={} path={} traceId={}",
                    status.value(), code, request.getRequestURI(), traceId, exception);
        } else {
            log.warn("Request rejected: status={} code={} path={} traceId={}",
                    status.value(), code, request.getRequestURI(), traceId, exception);
        }

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                status.value(),
                code,
                message,
                request.getRequestURI(),
                traceId,
                fieldErrors == null ? List.of() : fieldErrors);
        return ResponseEntity.status(status)
                .header(TraceIdFilter.TRACE_ID_HEADER, traceId)
                .body(body);
    }

    private String currentTraceId(HttpServletRequest request) {
        String traceId = MDC.get(TraceIdFilter.TRACE_ID_MDC_KEY);
        if (traceId == null) {
            Object attribute = request.getAttribute(TraceIdFilter.TRACE_ID_MDC_KEY);
            if (attribute instanceof String value) {
                traceId = value;
            }
        }
        if (traceId == null) {
            traceId = UUID.randomUUID().toString().replace("-", "");
        }
        return traceId;
    }
}
