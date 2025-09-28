import { v4 as uuidv4 } from 'uuid';

import { Identifier } from 'src/common/domain/types/identifier';

import { EmailRule } from '../rules/email.rule';

type UserProps = {
  id: Identifier;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserCreate = Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>;

type UserReconstruct = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserJson = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): Identifier {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateEmail(newEmail: string): void {
    if (!EmailRule.validate(newEmail)) {
      // TODO: Use AppException
      throw new Error('Invalid email format');
    }
    this.props.email = newEmail;
    this.props.updatedAt = new Date();
  }

  toJSON(): UserJson {
    return {
      id: this.id.toString(),
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static create(props: UserCreate): User {
    if (!EmailRule.validate(props.email)) {
      // TODO: Use AppException
      throw new Error('Invalid email format');
    }
    const id: Identifier = uuidv4() as Identifier;
    const now = new Date();
    return new User({
      id,
      email: props.email,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: UserReconstruct): User {
    const { id, email, createdAt, updatedAt } = props;
    return new User({
      id: id as Identifier,
      email,
      createdAt,
      updatedAt,
    });
  }
}
