import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: null })
  FullName!: string;

  @Column({ default: null })
  contactNumber!: string;

  @Column({ default: null })
  email!: string;

  @Column({ nullable: true })
  lastUserSession!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
