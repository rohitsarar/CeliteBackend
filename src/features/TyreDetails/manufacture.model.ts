import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

//This is Manufacturer Name Table
@Entity({ name: "manufacturers" })
export class Manufacturer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "name", type: "varchar", length: 100, unique: true })
  name!: string;
}
