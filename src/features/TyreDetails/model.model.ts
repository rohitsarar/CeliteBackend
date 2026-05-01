import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

//Model Name Table
@Entity({ name: "models" })
export class Model {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "name", type: "varchar", length: 100 })
  name!: string;

  @Column({ name: "manufacturer_id" })
  manufacturerId!: number;
}
