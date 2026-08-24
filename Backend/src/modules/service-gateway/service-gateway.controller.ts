import { Response, NextFunction } from "express";
import { serviceRegistry } from "../../services/serviceRegistry";
import { protect, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { asyncHandler } from "../../middleware/errorHandler";

/**
 * Centralized Service Dispatcher Controller
 * Receives POST /api/service requests, validates input, checks auth, and routes directly to the controller handler.
 */
export const dispatchService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { serviceId, payload = {}, params = {}, query = {} } = req.body;

    if (!serviceId) {
      throw new ValidationError("serviceId is required");
    }

    const service = serviceRegistry[serviceId];
    if (!service) {
      throw new NotFoundError(`Service with ID '${serviceId}' not found`);
    }

    // Rewrite request properties to match controller expectations
    req.body = payload;
    req.params = params;
    req.query = query;

    // Run validation if schemas are defined
    if (service.validation) {
      try {
        if (service.validation.body) {
          req.body = service.validation.body.parse(req.body);
        }
        if (service.validation.query) {
          req.query = service.validation.query.parse(req.query) as any;
        }
        if (service.validation.params) {
          req.params = service.validation.params.parse(req.params) as any;
        }
      } catch (error: any) {
        const details: Record<string, string> = {};
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            const path = err.path.join(".") || "root";
            details[path] = err.message;
          });
        }
        const firstErrorMessage = Object.values(details)[0];
        const errorMessage = firstErrorMessage || "Request validation failed";
        throw new ValidationError(errorMessage, details);
      }
    }

    // Run auth middleware if service requires authentication
    if (service.requiresAuth) {
      protect(req, res, (err) => {
        if (err) {
          next(err);
          return;
        }
        service.handler(req, res, next);
      });
    } else {
      service.handler(req, res, next);
    }
  }
);

/**
 * GET /api/service/registry
 * Returns all registered serviceIds and details (dev/diagnostic helper).
 */
export const listServices = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const services = Object.keys(serviceRegistry).map((key) => {
    const service = serviceRegistry[key];
    return {
      serviceId: service.serviceId,
      requiresAuth: service.requiresAuth,
      hasBodyValidation: !!service.validation?.body,
      hasQueryValidation: !!service.validation?.query,
      hasParamsValidation: !!service.validation?.params,
    };
  });

  res.json({
    count: services.length,
    services,
  });
});
