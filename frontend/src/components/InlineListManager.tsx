import { useState, type FormEvent } from "react";
import { Box, Button, IconButton, List, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export interface InlineField {
  name: string;
  label: string;
  type?: "text" | "number" | "date";
  required?: boolean;
}

interface InlineListManagerProps<T> {
  title: string;
  items: T[];
  fields: InlineField[];
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onDelete?: (item: T) => Promise<void>;
  getKey: (item: T) => string;
}

export function InlineListManager<T>({
  title,
  items,
  fields,
  getPrimary,
  getSecondary,
  onSubmit,
  onDelete,
  getKey,
}: InlineListManagerProps<T>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
      setValues({});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Henüz kayıt yok.
        </Typography>
      ) : (
        <List dense>
          {items.map((item) => (
            <ListItem
              key={getKey(item)}
              secondaryAction={
                onDelete && (
                  <IconButton edge="end" size="small" onClick={() => onDelete(item)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemText primary={getPrimary(item)} secondary={getSecondary?.(item)} />
            </ListItem>
          ))}
        </List>
      )}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}
      >
        {fields.map((f) => (
          <TextField
            key={f.name}
            label={f.label}
            type={f.type ?? "text"}
            size="small"
            required={f.required}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            slotProps={f.type === "date" ? { inputLabel: { shrink: true } } : undefined}
          />
        ))}
        <Button type="submit" variant="outlined" size="small" disabled={submitting}>
          Ekle
        </Button>
      </Box>
    </Box>
  );
}
