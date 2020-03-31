import AsyncRouter from '../AsyncRouter';
import { Response } from 'express';

import {
  createOrUpdateTest,
  getTests,
  accessManagerFactory,
} from '../../application/service';

import {
  AuthenticatedRequest,
  getAuthenticationOrFail,
} from '../AuthenticatedRequest';

import { Test } from '../../domain/model/test/Test';
import { UserId } from '../../domain/model/user/UserId';

import { isAuthenticated } from '../middleware/isAuthenticated';
import { ApiError, apiErrorCodes } from '../ApiError';
import { DomainValidationError } from '../../domain/model/DomainValidationError';
import { ResourceNotFoundError } from '../../domain/model/ResourceNotFoundError';

export default () => {
  const route = new AsyncRouter();

  route.get(
    '/users/:id/tests',
    isAuthenticated,
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const userId = new UserId(id);

      const canAccessUser = await accessManagerFactory
        .forAuthentication(getAuthenticationOrFail(req))
        .canAccessUser(userId);

      if (!canAccessUser) {
        throw new ApiError(404, apiErrorCodes.USER_NOT_FOUND);
      }

      const tests = await getTests.byUserId(id);

      return res
        .json(tests.map((test: any) => mapTestToApiTest(test)))
        .status(200);
    }
  );

  route.get(
    '/tests/:id',
    isAuthenticated,
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      const test = await getTests.byId(id);
      return res.json(mapTestToApiTest(test)).status(200);
    }
  );

  route.post(
    '/users/:id/tests',
    isAuthenticated,
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const payload = req.body;
      const userId = new UserId(id);

      const isLoggedInAsUser = accessManagerFactory
        .forAuthentication(getAuthenticationOrFail(req))
        .isLoggedInAsUser(userId);

      const hasAccessPassForUser = await accessManagerFactory
        .forAuthentication(getAuthenticationOrFail(req))
        .hasAccessPassForUser(userId);

      if (!isLoggedInAsUser && !hasAccessPassForUser) {
        throw new ApiError(404, apiErrorCodes.USER_NOT_FOUND);
      }

      const authentication = getAuthenticationOrFail(req);

      const canAccessUser = await accessManagerFactory
        .forAuthentication(authentication)
        .canAccessUser(userId);

      try {
        const test = await createOrUpdateTest.execute(
          authentication.user.id.value,
          id,
          payload
        );

        return res.status(201).json(mapTestToApiTest(test));
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          throw new ApiError(422, `${error.resourceName}.not-found`);
        }
        if (error instanceof DomainValidationError) {
          throw new ApiError(422, `test.invalid.${error.field}`, error.reason);
        }
        throw error;
      }
    }
  );

  // TODO: implement patch to update results later if needed.
  /*
  route.patch(
    '/tests/:id',
    isAuthenticated,
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const payload = req.body;
  );*/

  return route.middleware();
};

export function mapTestToApiTest(test: Test | null) {
  if (!test) {
    return null;
  }

  const results = test.results
    ? {
        details: test.results.details,
        testerUserId: test.results.createdBy,
        creationTime: test.results.creationTime,
      }
    : null;

  let apiTest = {
    id: test.id.value,
    userId: test.userId.value,
    testTypeId: test.testTypeId.value,
    creationTime: test.creationTime,
    results,
  };

  return apiTest;
}