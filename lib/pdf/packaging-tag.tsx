import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  row: { marginBottom: 4 },
  divider: { marginVertical: 8, borderBottomWidth: 1, borderBottomColor: "#ccc" },
});

export interface PackagingTagData {
  orderNumber: string;
  customerName: string;
  phone: string;
  addressLines: string[];
  items: Array<{ name: string; sku: string; qty: number }>;
  barcodeLabel: string;
  packedDate: string;
}

export function PackagingTagDocument({ data }: { data: PackagingTagData }) {
  return (
    <Document>
      <Page size={[283, 425]} style={styles.page}>
        <Text style={styles.title}>KAROSALE — PACKING SLIP</Text>
        <Text style={styles.row}>ORDER #{data.orderNumber}</Text>
        <Text style={styles.row}>Customer: {data.customerName}</Text>
        {data.addressLines.map((line, i) => (
          <Text key={i} style={styles.row}>
            {line}
          </Text>
        ))}
        <Text style={styles.row}>Phone: {data.phone}</Text>
        <View style={styles.divider} />
        {data.items.map((item, i) => (
          <Text key={i} style={styles.row}>
            {item.name} | SKU: {item.sku} | Qty: {item.qty}
          </Text>
        ))}
        <View style={styles.divider} />
        <Text style={styles.row}>Barcode: {data.barcodeLabel}</Text>
        <Text style={styles.row}>Packed: {data.packedDate}</Text>
        <Text style={{ marginTop: 12, fontSize: 8 }}>Organic. Natural. Trusted.</Text>
      </Page>
    </Document>
  );
}
