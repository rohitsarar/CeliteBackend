import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ default: null })
    firstName!: string;

    @Column({ default: null })
    lastName!: string;

    @Column({ default: null })
    phoneNo!: string;

    @Column({ default: null })
    userId!: string;

    @Column({ default: null, unique: true })
    email!: string;

    @Column({ nullable: true, unique: true })
    username!: string;

    @Column({ nullable: true })
    temPassword!: string;

    @Column({ nullable: true, default: false })
    isNotified!: boolean;

    @Column({ nullable: true, default: false })
    outline!: boolean;

    @Column({ default: null })
    centerCode!: string;

    @Column({ nullable: true })
    userPattenKey!: string;

    @Column({ nullable: true })
    lastUserSession!: string;

    @Column("simple-array", { nullable: true })
    centerId!: number[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}