import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
//Brand Name Table
@Entity({ name: "brands" })
export class Brand {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "name", type: "varchar", length: 100, unique: true })
  name!: string;
}
