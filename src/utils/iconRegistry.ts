import {
  Cloud, Server, Shield, Globe, Router, Database, Wifi, Network,
  Cpu, HardDrive, Radio, Lock, Zap, Box, Monitor, Building2,
  Factory, Landmark, CircuitBoard, Cable, Antenna,
  Activity, PanelRight, Menu, Share2, BarChart2, CloudLightning, Workflow
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Server,
  Shield,
  Globe,
  Router,
  Database,
  Wifi,
  Network,
  Cpu,
  HardDrive,
  Radio,
  Lock,
  Zap,
  Box,
  Monitor,
  Building2,
  Factory,
  Landmark,
  CircuitBoard,
  Cable,
  Antenna,
  Activity,
  PanelRight,
  Menu,
  Share2,
  BarChart2,
  CloudLightning,
  Workflow,
};

export function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Box;
}

export function getIconName(icon: LucideIcon | string): string {
  if (typeof icon === 'string') return icon;
  for (const [name, component] of Object.entries(ICON_MAP)) {
    if (component === icon) return name;
  }
  return 'Box';
}
