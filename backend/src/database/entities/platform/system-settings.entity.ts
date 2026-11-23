import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Platform-level key/value settings (organization settings live elsewhere). */
@Entity('system_settings')
@Index('UQ_system_settings_key', ['key'], { unique: true })
export class SystemSettings {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'key', length: 100 })
  key: string;

  @Column('text', { name: 'value' })
  value: string;

  @Column('varchar', { name: 'group', length: 50, default: 'general' })
  group: string;

  @Column('varchar', { name: 'description', length: 255, nullable: true })
  description: string | null;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at', precision: 6 })
  updatedAt: Date;
}
