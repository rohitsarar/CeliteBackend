import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

//Tyre Details Table combining all the details
@Entity({ name: "tyre_details" })
export class TyreDetails {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "manufacturer_name" })
  manufacturerName!: string;

  @Column({ name: "model_name" })
  modelName!: string;

  @Column({ name: "brand_name", type: "varchar", nullable: true })
  brandName!: string;

  @Column({ name: "size", type: "varchar" })
  size!: string;

  @Column({ name: "category", type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl!: string;
}
