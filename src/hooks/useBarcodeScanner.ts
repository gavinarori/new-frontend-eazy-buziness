import { useState, useEffect, useCallback } from 'react';
import { BarcodeScanner, ScanResult } from '../types';
import { useAppDispatch } from '../app/hooks';
import { lookupByBarcode } from '../features/products/productsSlice';
import { toast } from 'sonner';

// Extend Navigator interface for Web Serial API
interface SerialNavigator extends Navigator {
  serial: {
    getPorts(): Promise<SerialPort[]>;
    requestPort(): Promise<SerialPort>;
  };
}

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  readable: ReadableStream<Uint8Array>;
}

export const useBarcodeScanner = () => {
  const [scanner, setScanner] = useState<BarcodeScanner>({
    isConnected: false
  });
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const dispatch = useAppDispatch();

  // Initialize barcode scanner
  const initializeScanner = useCallback(async () => {
    try {
      // Check if Web Serial API is supported
      if ('serial' in navigator) {
        const serialNav = navigator as SerialNavigator;
        const ports = await serialNav.serial.getPorts();
        if (ports.length > 0) {
          setScanner({
            isConnected: true,
            deviceName: 'USB Barcode Scanner',
            timestamp: new Date()
          });
          toast.success('Barcode scanner connected');
        }
      } else {
        // Fallback to keyboard input simulation
        setScanner({
          isConnected: true,
          deviceName: 'Keyboard Input Scanner',
          timestamp: new Date()
        });
        toast.info('Using keyboard input for barcode scanning');
      }
    } catch (error) {
      console.error('Scanner initialization failed:', error);
      toast.error('Failed to connect barcode scanner');
    }
  }, []);

  // Connect to scanner
  const connectScanner = useCallback(async () => {
    try {
      if ('serial' in navigator) {
        const serialNav = navigator as SerialNavigator;
        const port = await serialNav.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        setScanner({
          isConnected: true,
          deviceName: 'USB Barcode Scanner',
          timestamp: new Date()
        });
        
        // Listen for barcode data
        const reader = port.readable.getReader();
        const decoder = new TextDecoder();
        
        const readLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              
              const barcode = decoder.decode(value).trim();
              if (barcode) {
                const scanResult: ScanResult = {
                  barcode,
                  timestamp: new Date(),
                  format: 'Unknown'
                };
                setLastScan(scanResult);
                toast.success(`Scanned: ${barcode}`);
                dispatch(lookupByBarcode({ barcode })).catch(() => {});
              }
            }
          } catch (error) {
            console.error('Reading error:', error);
          }
        };
        
        readLoop();
        toast.success('Barcode scanner connected via USB');
      }
    } catch (error) {
      console.error('Scanner connection failed:', error);
      toast.error('Failed to connect scanner');
    }
  }, []);

  // Disconnect scanner
  const disconnectScanner = useCallback(() => {
    setScanner({ isConnected: false });
    setLastScan(null);
    toast.info('Barcode scanner disconnected');
  }, []);

  // Simulate barcode scan (for testing)
  const simulateScan = useCallback((barcode: string) => {
    const scanResult: ScanResult = {
      barcode,
      timestamp: new Date(),
      format: 'Simulated'
    };
    setLastScan(scanResult);
    toast.success(`Simulated scan: ${barcode}`);
  }, []);

  // Keyboard event listener for barcode input
  useEffect(() => {
    let barcodeBuffer = '';
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only process if scanner is connected and not in an input field
      if (!scanner.isConnected || 
          (event.target as HTMLElement)?.tagName === 'INPUT' ||
          (event.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          const scanResult: ScanResult = {
            barcode: barcodeBuffer,
            timestamp: new Date(),
            format: 'Keyboard'
          };
          setLastScan(scanResult);
          toast.success(`Scanned: ${barcodeBuffer}`);
          dispatch(lookupByBarcode({ barcode: barcodeBuffer })).catch(() => {});
          barcodeBuffer = '';
        }
      } else if (event.key.length === 1) {
        barcodeBuffer += event.key;
        
        // Clear buffer after 100ms of inactivity
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };

    if (scanner.isConnected) {
      document.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [scanner.isConnected]);

  return {
    scanner,
    lastScan,
    initializeScanner,
    connectScanner,
    disconnectScanner,
    simulateScan
  };
};