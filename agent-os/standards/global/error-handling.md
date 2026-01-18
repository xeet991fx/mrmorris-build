## Error Handling Best Practices for MorrisB

### Core Principles

1. **User-Friendly Messages**: Provide clear, actionable error messages to users without exposing technical details or security information
2. **Fail Fast and Explicitly**: Validate input and check preconditions early; fail with clear error messages rather than allowing invalid state
3. **Specific Exception Types**: Use specific exception/error types rather than generic ones to enable targeted handling
4. **Centralized Error Handling**: Handle errors at appropriate boundaries (controllers, API layers) rather than scattering try-catch blocks everywhere
5. **Graceful Degradation**: Design systems to degrade gracefully when non-critical services fail rather than breaking entirely
6. **Retry Strategies**: Implement exponential backoff for transient failures in external service calls
7. **Clean Up Resources**: Always clean up resources (file handles, connections) in finally blocks or equivalent mechanisms

---

## Custom Error System

MorrisB uses a custom error handling system located in `backend/src/errors/`.

### Error Classes

| Class | Status Code | Use Case |
|-------|-------------|----------|
| `ValidationError` | 400 | Invalid input, missing fields, format errors |
| `UnauthorizedError` | 401 | Missing or invalid authentication |
| `ForbiddenError` | 403 | Authenticated but lacking permissions |
| `NotFoundError` | 404 | Resource doesn't exist |
| `ConflictError` | 409 | Duplicate entries, resource conflicts |
| `RateLimitError` | 429 | Too many requests |
| `InternalError` | 500 | Unexpected server errors |
| `ExternalServiceError` | 502 | Third-party service failures |
| `ServiceUnavailableError` | 503 | Temporary unavailability |

### Required Pattern

```typescript
import { asyncAuthHandler, NotFoundError, ForbiddenError } from "../errors";

router.get("/:id", authenticate, asyncAuthHandler(async (req, res) => {
    const resource = await Model.findById(req.params.id);
    if (!resource) {
        throw new NotFoundError("Resource", req.params.id);
    }
    res.json({ success: true, data: resource });
}));
```

### Factory Methods

Use static factory methods for common scenarios:

```typescript
// Validation
throw ValidationError.missingField("email");
throw ValidationError.invalidId("contact");

// Auth
throw UnauthorizedError.invalidCredentials();
throw ForbiddenError.workspaceAccess();

// Resources
throw NotFoundError.workspace(id);
throw NotFoundError.contact(id);
throw ConflictError.emailExists();
```

### Response Format

All errors return this consistent structure:

```json
{
    "success": false,
    "error": {
        "message": "Human-readable message",
        "code": "ERROR_CODE",
        "details": { ... }
    }
}
```

---

## Anti-Patterns (NEVER DO)

❌ Manual error responses in routes:
```typescript
res.status(404).json({ error: "Not found" }); // BAD
```

❌ Generic Error throws:
```typescript
throw new Error("Something went wrong"); // BAD
```

❌ Swallowing errors silently:
```typescript
catch (err) { console.error(err); } // BAD - error lost
```

❌ Inconsistent error formats:
```typescript
res.json({ error: "message" });  // BAD
res.json({ message: "error" });  // BAD - inconsistent
```

---

## File Locations

- **Error Classes**: `backend/src/errors/AppError.ts`
- **Error Handler Middleware**: `backend/src/middleware/errorHandler.ts`
- **Module Exports**: `backend/src/errors/index.ts`
- **Claude Skill**: `.claude/skills/global-error-handling/SKILL.md`
