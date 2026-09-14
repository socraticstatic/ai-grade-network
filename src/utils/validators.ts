// Validation utilities

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-\(\)]+$/.test(phone);
}

export function isValidVlanId(vlanId: number): boolean {
  return Number.isInteger(vlanId) && vlanId >= 1 && vlanId <= 4094;
}

export function isValidIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

export function isValidSubnet(subnet: string): boolean {
  const parts = subnet.split('/');
  if (parts.length !== 2) return false;
  
  const [ip, mask] = parts;
  const maskNum = parseInt(mask, 10);
  
  return isValidIPAddress(ip) && maskNum >= 0 && maskNum <= 32;
}

export function isFutureDate(dateString: string): boolean {
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return selectedDate >= today;
}