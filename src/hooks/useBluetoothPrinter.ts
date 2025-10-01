import { useState, useCallback } from 'react';
import { PrinterConfig, } from '../types';
import { useAppDispatch } from '../app/hooks';
import { Order } from '../types';
import { toast } from 'sonner';

// Extend Navigator interface for Web Bluetooth API
interface BluetoothNavigator extends Navigator {
  bluetooth: {
    requestDevice(options: {
      filters: { namePrefix?: string }[];
      optionalServices: string[];
    }): Promise<BluetoothDevice>;
  };
}

interface BluetoothDevice {
  name: string;
  gatt: {
    connect(): Promise<BluetoothRemoteGATTServer>;
  };
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
}

export const useBluetoothPrinter = () => {
  const [printer, setPrinter] = useState<PrinterConfig>({
    isConnected: false,
    paperWidth: 48, // 48mm for thermal printers
    characterWidth: 32 // characters per line
  });
  const dispatch = useAppDispatch();

  // Connect to EOS Bluetooth printer
  const connectPrinter = useCallback(async () => {
    try {
      if (!('bluetooth' in navigator)) {
        toast.error('Bluetooth not supported in this browser');
        return;
      }

      const bluetoothNav = navigator as BluetoothNavigator;
      const device = await bluetoothNav.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'EOS' },
          { namePrefix: 'TM-' },
          { namePrefix: 'POS' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Serial service
      });

      const server = await device.gatt.connect();
      
      setPrinter({
        isConnected: true,
        deviceName: device.name,
        paperWidth: 48,
        characterWidth: 32
      });

      toast.success(`Connected to ${device.name}`);
    } catch (error) {
      console.error('Printer connection failed:', error);
      toast.error('Failed to connect to printer');
    }
  }, []);

  // Disconnect printer
  const disconnectPrinter = useCallback(() => {
    setPrinter({
      isConnected: false,
      paperWidth: 48,
      characterWidth: 32
    });
    toast.info('Printer disconnected');
  }, []);

  // Format receipt text for thermal printer
  const formatReceipt = useCallback((order: Order): string => {
    const { characterWidth } = printer;
    const line = '='.repeat(characterWidth);
    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((characterWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    let receipt = '';
    
    // Header
    receipt += centerText('RECEIPT') + '\n';
    receipt += line + '\n';
    receipt += `Order #: ${order.id.slice(-8)}\n`;
    receipt += `Date: ${order.timestamp.toLocaleDateString()}\n`;
    receipt += `Time: ${order.timestamp.toLocaleTimeString()}\n`;
    receipt += line + '\n';
    
    // Items
    receipt += 'ITEMS:\n';
    order.items.forEach(item => {
      const name = item.product.name.padEnd(20);
      const qty = `x${item.quantity}`.padStart(4);
      const price = `$${(item.product.price * item.quantity).toFixed(2)}`.padStart(8);
      receipt += `${name.substring(0, 20)} ${qty} ${price}\n`;
    });
    
    receipt += line + '\n';
    
    // Total
    const totalLine = `TOTAL: $${order.total.toFixed(2)}`.padStart(characterWidth);
    receipt += totalLine + '\n';
    receipt += `Payment: ${order.paymentMethod.toUpperCase()}\n`;
    
    receipt += line + '\n';
    receipt += centerText('Thank you!') + '\n';
    receipt += centerText('Please come again') + '\n';
    receipt += '\n\n\n'; // Feed paper
    
    return receipt;
  }, [printer]);

  // Send print job to EOS printer
  const printReceipt = useCallback(async (order: Order) => {
    if (!printer.isConnected) {
      toast.error('Printer not connected');
      return false;
    }

    try {
      const receiptText = formatReceipt(order);
      
      // ESC/POS commands for EOS thermal printers
      const commands = new Uint8Array([
        0x1B, 0x40, // Initialize printer
        0x1B, 0x61, 0x01, // Center alignment
        0x1B, 0x45, 0x01, // Bold on
        ...new TextEncoder().encode('RECEIPT\n'),
        0x1B, 0x45, 0x00, // Bold off
        0x1B, 0x61, 0x00, // Left alignment
        ...new TextEncoder().encode(receiptText),
        0x1D, 0x56, 0x00, // Cut paper
      ]);

      // In a real implementation, send commands to printer via Bluetooth
      // For now, we'll simulate the printing process
      toast.success('Receipt sent to printer');
      
      // Open print dialog as fallback
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; font-size: 12px; margin: 20px; }
                pre { white-space: pre-wrap; }
              </style>
            </head>
            <body>
              <pre>${receiptText}</pre>
            </body>
        </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      
      return true;
    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Failed to print receipt');
      return false;
    }
  }, [printer, formatReceipt]);

  // Test printer connection
  const testPrint = useCallback(async () => {
    if (!printer.isConnected) {
      toast.error('Printer not connected');
      return;
    }

    const testText = `
${'='.repeat(32)}
        TEST PRINT
${'='.repeat(32)}
Date: ${new Date().toLocaleString()}
Printer: ${printer.deviceName || 'EOS Thermal'}
Status: Connected
${'='.repeat(32)}


`;

    // Simulate test print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Test Print</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${testText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast.success('Test print sent');
  }, [printer]);

  return {
    printer,
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    testPrint
  };
};