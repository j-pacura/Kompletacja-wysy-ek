import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

/**
 * Radwag RS-232 Scale Interface
 *
 * Protocol Specification:
 * - Baud Rate: 9600
 * - Data Bits: 8
 * - Parity: None
 * - Stop Bits: 1
 * - Flow Control: None
 * - Cable: NULL-MODEM (crossed TX/RX)
 *
 * Commands:
 * - SI: Immediate reading (stable or unstable)
 * - S: Stable reading only (waits for stability)
 * - C1: Start continuous mode
 * - C0: Stop continuous mode
 * - Z: Zero the scale
 * - T: Tare
 *
 * Response Format: "S _ + 12.345 kg"
 * - Position 0: Stability indicator (S=stable, U=unstable, !=error)
 * - Position 1: Space
 * - Position 2: Sign (+/-)
 * - Position 3-9: Weight value
 * - Position 10-11: Space
 * - Position 12-14: Unit (kg, g, lb, oz, etc.)
 */

export interface ScaleReading {
  value: number;
  unit: string;
  stable: boolean;
  timestamp: number;
}

export interface ScaleError {
  message: string;
  code?: string;
}

let port: SerialPort | null = null;
let parser: ReadlineParser | null = null;
let lastReading: ScaleReading | null = null;
let continuousMode = false;
let readingCallback: ((reading: ScaleReading) => void) | null = null;

/**
 * List available COM ports
 */
export async function listPorts(): Promise<string[]> {
  try {
    const ports = await SerialPort.list();
    return ports.map(p => p.path);
  } catch (error) {
    console.error('Failed to list ports:', error);
    return [];
  }
}

/**
 * Connect to Radwag scale on specified COM port
 */
export async function connect(portPath: string, baudRate: number = 9600): Promise<boolean> {
  try {
    // Close existing connection if any
    if (port && port.isOpen) {
      await disconnect();
    }

    console.log(`Connecting to scale on ${portPath} at ${baudRate} baud...`);

    port = new SerialPort({
      path: portPath,
      baudRate: baudRate,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      autoOpen: false,
    });

    // Create parser for line-based reading
    parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // Setup data listener
    parser.on('data', handleScaleData);

    // Setup error listener
    port.on('error', (err) => {
      console.error('Serial port error:', err);
    });

    // Open the port
    await new Promise<void>((resolve, reject) => {
      port!.open((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('Scale connected successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to scale:', error);
    return false;
  }
}

/**
 * Disconnect from scale
 */
export async function disconnect(): Promise<void> {
  if (port && port.isOpen) {
    // Stop continuous mode if active
    if (continuousMode) {
      await stopContinuous();
    }

    await new Promise<void>((resolve) => {
      port!.close(() => {
        console.log('Scale disconnected');
        resolve();
      });
    });

    port = null;
    parser = null;
    lastReading = null;
    readingCallback = null;
  }
}

/**
 * Check if scale is connected
 */
export function isConnected(): boolean {
  return port !== null && port.isOpen;
}

/**
 * Parse Radwag response format
 * Example: "S _ + 12.345 kg"
 */
function parseScaleResponse(response: string): ScaleReading | ScaleError {
  try {
    const trimmed = response.trim();

    // Check minimum length
    if (trimmed.length < 10) {
      return { message: 'Invalid response format', code: 'FORMAT_ERROR' };
    }

    // Extract stability indicator (S=stable, U=unstable, !=error)
    const stabilityChar = trimmed[0];
    if (stabilityChar === '!') {
      return { message: 'Scale error', code: 'SCALE_ERROR' };
    }
    const stable = stabilityChar === 'S';

    // Extract sign and value
    const signChar = trimmed[2];
    const sign = signChar === '-' ? -1 : 1;

    // Extract numeric value (positions 3-9, but can be variable)
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) {
      return { message: 'Invalid response format', code: 'FORMAT_ERROR' };
    }

    // Parse value (format: "+12.345" or "-12.345")
    const valueStr = parts[1].replace(/[^\d.-]/g, '');
    const value = parseFloat(valueStr) * sign;

    if (isNaN(value)) {
      return { message: 'Invalid value', code: 'PARSE_ERROR' };
    }

    // Extract unit
    const unit = parts[2] || 'kg';

    return {
      value,
      unit,
      stable,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to parse scale response:', error);
    return { message: 'Parse error', code: 'PARSE_ERROR' };
  }
}

/**
 * Handle incoming data from scale
 */
function handleScaleData(data: string): void {
  console.log('Scale data received:', data);

  const result = parseScaleResponse(data);

  if ('message' in result) {
    // Error
    console.error('Scale reading error:', result);
    return;
  }

  // Valid reading
  lastReading = result;

  // Trigger callback if in continuous mode
  if (continuousMode && readingCallback) {
    readingCallback(result);
  }
}

/**
 * Send command to scale
 */
async function sendCommand(command: string): Promise<boolean> {
  if (!port || !port.isOpen) {
    console.error('Scale not connected');
    return false;
  }

  return new Promise((resolve) => {
    port!.write(command + '\r\n', (err) => {
      if (err) {
        console.error('Failed to send command:', err);
        resolve(false);
      } else {
        console.log('Command sent:', command);
        resolve(true);
      }
    });
  });
}

/**
 * Get immediate reading (stable or unstable)
 */
export async function getImmediate(): Promise<ScaleReading | ScaleError> {
  if (!port || !port.isOpen) {
    return { message: 'Scale not connected', code: 'NOT_CONNECTED' };
  }

  // Clear last reading
  lastReading = null;

  // Send SI command
  const sent = await sendCommand('SI');
  if (!sent) {
    return { message: 'Failed to send command', code: 'SEND_ERROR' };
  }

  // Wait for response (max 2 seconds)
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 100ms = 2 seconds

    const interval = setInterval(() => {
      attempts++;

      if (lastReading) {
        clearInterval(interval);
        resolve(lastReading);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        resolve({ message: 'Timeout waiting for response', code: 'TIMEOUT' });
      }
    }, 100);
  });
}

/**
 * Get stable reading only (waits for stability)
 */
export async function getStable(): Promise<ScaleReading | ScaleError> {
  if (!port || !port.isOpen) {
    return { message: 'Scale not connected', code: 'NOT_CONNECTED' };
  }

  // Clear last reading
  lastReading = null;

  // Send S command
  const sent = await sendCommand('S');
  if (!sent) {
    return { message: 'Failed to send command', code: 'SEND_ERROR' };
  }

  // Wait for stable response (max 10 seconds)
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 100; // 100 * 100ms = 10 seconds

    const interval = setInterval(() => {
      attempts++;

      if (lastReading && lastReading.stable) {
        clearInterval(interval);
        resolve(lastReading);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        resolve({ message: 'Timeout waiting for stable reading', code: 'TIMEOUT' });
      }
    }, 100);
  });
}

/**
 * Start continuous reading mode
 */
export async function startContinuous(callback: (reading: ScaleReading) => void): Promise<boolean> {
  if (!port || !port.isOpen) {
    return false;
  }

  readingCallback = callback;
  continuousMode = true;

  const sent = await sendCommand('C1');
  return sent;
}

/**
 * Stop continuous reading mode
 */
export async function stopContinuous(): Promise<boolean> {
  if (!port || !port.isOpen) {
    return false;
  }

  continuousMode = false;
  readingCallback = null;

  const sent = await sendCommand('C0');
  return sent;
}

/**
 * Zero the scale
 */
export async function zero(): Promise<boolean> {
  if (!port || !port.isOpen) {
    return false;
  }

  const sent = await sendCommand('Z');
  return sent;
}

/**
 * Tare the scale
 */
export async function tare(): Promise<boolean> {
  if (!port || !port.isOpen) {
    return false;
  }

  const sent = await sendCommand('T');
  return sent;
}

/**
 * Get last reading (without sending command)
 */
export function getLastReading(): ScaleReading | null {
  return lastReading;
}
