import { roleRepository, userRepository } from '../../../infrastructure/persistence';
import database from '../../../database';
import { BulkCreateUsers } from './BulkCreateUsers';
import { cleanupDatabase } from '../../../test/cleanupDatabase';
import { anEmail, aNewUser } from '../../../test/domainFactories';
import { USER, DOCTOR } from '../../../domain/model/authentication/Roles';
import { Role } from '../../../domain/model/authentication/Role';
import { CreateUserCommand } from '../../../presentation/commands/admin/CreateUserCommand';

describe('BulkCreateUsers', () => {
  const bulkCreateUsers = new BulkCreateUsers(userRepository, roleRepository);

  beforeEach(async () => {
    await cleanupDatabase();
    await roleRepository.save(new Role(DOCTOR));
  });

  it('create users when given a set of users as a command', async () => {
    const email1 = anEmail(),
      email2 = anEmail();
    const roles1 = [DOCTOR, USER],
      roles2 = [USER];
    const command = [
      { email: email1.value, roles: roles1 },
      { email: email2.value, roles: roles2 },
    ] as CreateUserCommand[];

    const resultUsers = await bulkCreateUsers.execute(command);

    expect(resultUsers).toBeDefined();
    expect(resultUsers.length).toEqual(2);

    const user1 = await userRepository.findByEmail(email1);
    expect(user1!.roles.sort()).toEqual(roles1.sort());

    const user2 = await userRepository.findByEmail(email2);
    expect(user2!.roles.sort()).toEqual(roles2.sort());
  });

  it('it adds the new roles for an user if it already exists', async () => {
    const existingUser = await userRepository.save(aNewUser());
    const command = [{ email: existingUser.email.value, roles: [DOCTOR] }] as CreateUserCommand[];

    const resultUsers = await bulkCreateUsers.execute(command);
    expect(resultUsers.length).toEqual(1);

    const updatedExistingUser = await userRepository.findByEmail(existingUser.email);

    expect(updatedExistingUser!.roles.length).toEqual(existingUser.roles.length + 1);
    expect(updatedExistingUser!.roles.sort()).toEqual([DOCTOR]);
  });
});

afterAll(() => {
  return database.destroy();
});
