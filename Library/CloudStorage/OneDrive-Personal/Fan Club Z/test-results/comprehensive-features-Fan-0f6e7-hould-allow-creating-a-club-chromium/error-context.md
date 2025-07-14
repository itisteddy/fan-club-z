# Page snapshot

```yaml
- dialog "Create New Club":
  - heading "Create New Club" [level=2]
  - text: Club Name
  - textbox "Enter club name": Test Club
  - text: Description
  - textbox "Describe your club": A test club for testing
  - text: Category
  - combobox: ⚽ Sports
  - checkbox "Private club (invite only)"
  - text: Private club (invite only)
  - button "Cancel"
  - button "Create Club"
  - button "Close":
    - img
    - text: Close
```