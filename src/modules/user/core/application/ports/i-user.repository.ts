import { User } from '../../domain/entities/user.entity';

export interface IUserRepository {
  /**
   * @param id - The unique identifier of the user.
   * @returns A promise that resolves to the user if found, otherwise null.
   */
  findById(id: string): Promise<User | null>;

  /**
   * @param email - The email address of the user.
   * @returns A promise that resolves to the user if found, otherwise null.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Saves a user to the repository. If the user already exists, it updates the existing record.
   * @param user - The user entity to be saved or updated.
   * @returns A promise that resolves to the saved or updated user entity.
   */
  save(user: User): Promise<User>;

  /**
   * Deletes a user from the repository.
   * @param id - The unique identifier of the user to be deleted.
   * @returns A promise that resolves when the user has been deleted.
   */
  delete(id: string): Promise<void>;
}
