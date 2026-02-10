import * as fs from 'fs';
import * as path from 'path';

// By using a generic type T, this function works with any object type.
/**
 * Reads a JSON file expected to contain an array of objects, appends a new object,
 * and writes the complete array back to the file.
 * * @param filePath The path to the JSON file (e.g., 'output.json').
 * @param newObject The object of type T to append to the array.
 * @returns A boolean indicating success or failure.
 */
export function appendObjectToArrayFile<T>(
  filePath: string,
  newObject: T,
): boolean {
  let list: T[] = [];
  const absolutePath = path.resolve(filePath);

  // 1. READ and PARSE existing file content
  if (fs.existsSync(absolutePath)) {
    try {
      // Read with 'utf8' encoding to get a string
      const fileContent = fs.readFileSync(absolutePath, 'utf8');

      // Handle empty/new file (if content is just whitespace)
      if (fileContent.trim() !== '') {
        // The key step: Parse and assert the list type as T[]
        list = JSON.parse(fileContent) as T[];

        // Safety check: ensure the parsed result is actually an array
        if (!Array.isArray(list)) {
          console.error(
            `Error: File content is not a JSON array. File: ${filePath}`,
          );
          return false;
        }
      }
    } catch (error) {
      // Catches file access errors or JSON parsing errors (SyntaxError)
      console.error(`Error reading or parsing JSON file ${filePath}:`, error);
      return false;
    }
  } else {
    // Log creation of a new file for clarity
    console.log(`File not found. Creating new file: ${filePath}`);
  }

  // 2. MODIFY (Add the new object)
  list.push(newObject);

  // 3. WRITE the entire array back to the file
  try {
    // Use null, 2 for readable, indented JSON output
    fs.writeFileSync(absolutePath, JSON.stringify(list, null, 2), 'utf8');
    console.log(`Successfully appended one object to array in ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to JSON file ${filePath}:`, error);
    return false;
  }
}
