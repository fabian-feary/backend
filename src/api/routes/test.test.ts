import request from 'supertest';
import expressApp from '../../loaders/express';
import database from '../../database';
import { cleanupDatabase } from '../../test/cleanupDatabase';

import { getTokenForUser } from '../../test/authentication';
import { TestTypeId } from '../../domain/model/testType/TestTypeId';

import { testRepository } from '../../infrastructure/persistence';
import { Test } from '../../domain/model/test/Test';
import { TestId } from '../../domain/model/test/TestId';

import { UserId } from '../../domain/model/user/UserId';
import {
  userRepository,
  testTypeRepository,
} from '../../infrastructure/persistence';
import { User } from '../../domain/model/user/User';
import { Email } from '../../domain/model/user/Email';
import { aNewUser, aTestType, aTest } from '../../test/domainFactories';

describe('test endpoints', () => {
  const app = expressApp();

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('GET /users/:id/tests', () => {
    it('returns 401 if user is not authenticated', async () => {
      const userId = new UserId();
      await request(app).get(`/api/v1/users/${userId.value}/tests`).expect(401);
    });

    it('returns 404 if user is not found', async () => {
      const user = await userRepository.save(aNewUser());
      const unknowUserId = new UserId();

      await request(app)
        .get(`/api/v1/users/${unknowUserId.value}/tests`)
        .set({ Authorization: `Bearer ${await getTokenForUser(user)}` })
        .expect(404);
    });

    it('returns 200 with the existing test if user is found', async () => {
      const user = await userRepository.save(aNewUser());
      const test = await testRepository.save(aTest(user.id));

      await request(app)
        .get(`/api/v1/users/${user.id.value}/tests`)
        .set({ Authorization: `Bearer ${await getTokenForUser(user)}` })
        .expect(200)
        .expect((response) => {
          expect(response.body[0].id).toEqual(test.id.value);
        });
    });

    it('returns 200 if a user with an access pass requests another users tests', async () => {
      // TODO
    });
  });

  describe('POST /users/:id/tests', () => {
    it('returns 401 if user is not authenticated', async () => {
      const userId = new UserId();
      await request(app)
        .post(`/api/v1/users/${userId.value}/tests`)
        .expect(401);
    });

    it('returns 404 if user is not found', async () => {
      const user = await userRepository.save(aNewUser());
      const unknowUserId = new UserId();

      await request(app)
        .post(`/api/v1/users/${unknowUserId.value}/tests`)
        .set({ Authorization: `Bearer ${await getTokenForUser(user)}` })
        .expect(404);
    });

    it('returns 403 if a user with an access pass tries to create a test for another user', async () => {
      // TODO
    });

    it('returns 422 if the test type does not exist', async () => {
      const user = await userRepository.save(aNewUser());
      const testType = aTestType();

      await request(app)
        .post(`/api/v1/users/${user.id.value}/tests`)
        .set({ Authorization: `Bearer ${await getTokenForUser(user)}` })
        .send({ testTypeId: testType.id.value })
        .expect(422);
    });

    it('returns 422 if there are malformed results', async () => {
      const user = await userRepository.save(aNewUser());
      const testType = await testTypeRepository.save(aTestType());

      await request(app)
        .post(`/api/v1/users/${user.id.value}/tests`)
        .set({ Authorization: `Bearer ${await getTokenForUser(user)}` })
        .send({
          testTypeId: testType.id.value,
          results: {
            testerUserId: user.id.value,
            details: { c: 12, igg: 'Wot', igm: [] },
          },
        })
        .expect(422);
    });

    it('returns 201 with the new test if user is found', async () => {
      const user = await userRepository.save(aNewUser());
      const testType = await testTypeRepository.save(aTestType());

      const validTest = {
        testTypeId: testType.id.value,
        results: {
          testerUserId: user.id.value,
          details: { c: true, igg: false, igm: true },
        },
      };

      await request(app)
        .post(`/api/v1/users/${user.id.value}/tests`)
        .set({
          Authorization: `Bearer ${await getTokenForUser(user)}`,
        })
        .send(validTest)
        .expect(201)
        .expect((response) => {
          expect(response.body.testTypeId).toEqual(validTest.testTypeId);
          expect(response.body.id).toBeDefined();
          expect(response.body.userId).toEqual(user.id.value);
          expect(response.body.creationTime).toBeDefined();
        });
    });
  });
});

afterAll(() => {
  return database.destroy();
});
