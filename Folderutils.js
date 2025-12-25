/**
 * Folder Utilities - Create and manage folder structure
 */

const FolderUtils = {
  
  /**
   * Create complete folder structure for a leader
   * Returns the leader's folder object
   */
  createLeaderFolderStructure: function(eventData) {
    const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
    
    // Step 1: Get or create company folder
    const companyFolder = this.getOrCreateFolder(
      strongTeamsFolder, 
      eventData.companyName
    );
    Logger.log(`Company folder: ${eventData.companyName}`);
    
    // Step 2: Get or create leader folder (First Last format)
    const leaderFolderName = eventData.fullName; // Already formatted as "April Welch"
    const leaderFolder = this.getOrCreateFolder(
      companyFolder, 
      leaderFolderName
    );
    Logger.log(`Leader folder: ${leaderFolderName}`);
    
    return {
      companyFolder: companyFolder,
      leaderFolder: leaderFolder,
      leaderFolderId: leaderFolder.getId()
    };
  },
  
  /**
   * Get existing folder or create new one
   */
  getOrCreateFolder: function(parentFolder, folderName) {
    const existingFolder = this.findFolderByName(parentFolder, folderName);
    
    if (existingFolder) {
      Logger.log(`  ✓ Found existing folder: ${folderName}`);
      return existingFolder;
    }
    
    Logger.log(`  + Creating new folder: ${folderName}`);
    return parentFolder.createFolder(folderName);
  },
  
  /**
   * Find folder by exact name within parent folder
   */
  findFolderByName: function(parentFolder, folderName) {
    const folders = parentFolder.getFoldersByName(folderName);
    return folders.hasNext() ? folders.next() : null;
  },
  
  /**
   * Check if a specific file exists in a folder
   */
  findFileInFolder: function(folder, fileName) {
    const files = folder.getFilesByName(fileName);
    return files.hasNext() ? files.next() : null;
  }
};