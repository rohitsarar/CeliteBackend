import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import type { TyreSpec } from "./tyre-content";

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

  /** false = hidden from the website (admin "Hide"); the row is kept. */
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  // ── Product-page content (see tyre-content.ts). Not selected by default so
  //    the catalogue list stays small; the detail endpoint selects them.
  @Column({ name: "description", type: "text", nullable: true, select: false })
  description!: string | null;

  @Column({ name: "highlights", type: "json", nullable: true, select: false })
  highlights!: string[] | null;

  @Column({ name: "specs", type: "json", nullable: true, select: false })
  specs!: TyreSpec[] | null;
}
