import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

//Tyre Details Table combining all the details
@Entity({ name: "tyre_details" })
export class TyreDetails {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "manufacturer_id" })
  manufacturerId!: number;

  @Column({ name: "model_id" })
  modelId!: number;

  @Column({ name: "brand_id" })
  brandId!: number;

  @Column({ name: "size", type: "varchar", length: 50 })
  size!: string;

  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl!: string;
}
