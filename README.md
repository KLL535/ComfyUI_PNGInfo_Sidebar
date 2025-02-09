# ComfyUI_PNGInfo_Sidebar

### Description:
ComfyUI custom frontend extension that adds a sidebar for easy viewing of PNG file metadata.

### Why is this needed:
If you have a lot of images generated in **Forge**, you switched to **СomfyUI**, and you really miss the **PNGInfo tab**, then this extension will help you.
The extension adds a tab on the left, which, when opened, will open a convenient window for viewing PNG image metadata.
Just click on the button/image and open the image. Or drag the image to this part of the window to open it.

![image](https://github.com/user-attachments/assets/429eaff3-6e45-4636-ae99-75d8ac34b374)

### Advantages:
Allows you to conveniently view information without stopping the workflow.

### Disadvantages:
- Metadata created by **СomfyUI** is supported, but files saved by standard **СomfyUI** tools may cause problems due to **СomfyUI** specific approach to storing information. Depending on the workspace, there may be no prompt at all in the metadata, or there may be 9 of them stored and all of them are incorrect.

## How to install?

### Method 1: Manager (Recommended)
If you have *ComfyUI-Manager*, you can click `Custom Nodes Manager` and find `ComfyUI_PNGInfo_Sidebar`.

### Method 2: Manual
In Windows:
- run `cmd`, go to the ComfyUI folder
- `cd custom_nodes`
- `git clone https://github.com/KLL535/ComfyUI_PNGInfo_Sidebar.git`
- Start/restart ComfyUI

## Settings sections
Look for **PNGInfo** tab: 

![image](https://github.com/user-attachments/assets/d70c20a0-0cdd-4163-addc-6d88f7e14d4d)
![image](https://github.com/user-attachments/assets/d606bd61-190e-49e9-9cae-a23d86b3075d)

General:
- `Font Name` - You can customize the font, for example `georgia italic bold`.
- `Font Size` - You can customize the font size.
- `Image Size` - You can customize the image size.
- `Enable (after restart)` - You can disable this tab (will work after restart).
  
Colors / Colors (Dark Theme):
- `Color Text` - You can change the color of the main text.
- `Color File` - You can change the color of file names.
- `Color Number` - You can change the color of numbers.
- `Color Header` - You can change the color of headers.

[!] Tested on Windows only. Tested on **Forge** and **СomfyUI** metadata only. 
  
