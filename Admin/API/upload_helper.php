<?php
function handleFileUpload($file, $destination) {
    // Create upload directory if it doesn't exist
    if (!file_exists($destination)) {
        mkdir($destination, 0777, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $targetPath = $destination . '/' . $filename;

    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return str_replace($_SERVER['DOCUMENT_ROOT'], '', $targetPath);
    }
    
    return false;
}
?>