import { parseAmodelXml } from '@/parser/amodelParser';
import { AquaSimModel } from '@/parser/types';

export interface FileLoaderCallbacks {
    onLoadStart?: (filename: string) => void;
    onLoadSuccess: (model: AquaSimModel, filename: string) => void;
    onLoadError: (error: Error, filename: string) => void;
}

/**
 * Handles file reading via file input and drag-and-drop.
 */
export function setupFileLoader(
    fileInputElement: HTMLInputElement,
    dropZoneElement: HTMLElement,
    callbacks: FileLoaderCallbacks
): void {
    function processFile(file: File) {
        if (!file.name.toLowerCase().endsWith('.amodel') && !file.name.toLowerCase().endsWith('.xml')) {
            callbacks.onLoadError(
                new Error(`Unsupported file type: "${file.name}". Please select an .amodel file.`),
                file.name
            );
            return;
        }

        if (callbacks.onLoadStart) {
            callbacks.onLoadStart(file.name);
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) {
                    throw new Error('File content is empty.');
                }
                const model = parseAmodelXml(text);
                callbacks.onLoadSuccess(model, file.name);
            } catch (err) {
                callbacks.onLoadError(err instanceof Error ? err : new Error(String(err)), file.name);
            }
        };

        reader.onerror = () => {
            callbacks.onLoadError(new Error('Failed to read file from disk.'), file.name);
        };

        reader.readAsText(file);
    }

    // Input change
    fileInputElement.addEventListener('change', () => {
        if (fileInputElement.files && fileInputElement.files.length > 0) {
            processFile(fileInputElement.files[0]);
            fileInputElement.value = ''; // Reset for next selection
        }
    });

    // Drag and Drop
    dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('drop-overlay')!.classList.add('drag-active');
    });

    dropZoneElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('drag-active');
    });

    dropZoneElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneElement.classList.remove('drag-active');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });
}

/**
 * Helper to fetch a sample model from the public directory.
 */
export async function loadSampleModel(
    url: string,
    filename: string,
    callbacks: FileLoaderCallbacks
): Promise<void> {
    try {
        if (callbacks.onLoadStart) callbacks.onLoadStart(filename);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: HTTP ${response.status}`);
        }
        const text = await response.text();
        const model = parseAmodelXml(text);
        callbacks.onLoadSuccess(model, filename);
    } catch (err) {
        callbacks.onLoadError(err instanceof Error ? err : new Error(String(err)), filename);
    }
}
