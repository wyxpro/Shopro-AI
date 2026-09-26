import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sparkles, Search, Languages, Camera, Download, Star, Check, Video, ArrowRight, Info, Eye, Loader2, X,
  Database, Zap, Radio, Globe2, CheckCircle2, RefreshCw, Sliders, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 智能选品数据类型 ───────────────────────────────────────────────────────
interface SelectableProduct {
  id: string;
  name: string;
  category: string;
  original_price: number;
  sale_price: number;
  currency: string;
  country: string;
  country_flag: string;
  rating: number;
  commission_rate: number;
  stock: number;
  cover_image: string;
  shop_name: string;
  shop_logo: string;
  shop_sales: string;
  influencer_rate: string;
  trend_data: number[];
  sales_7d: string;
  sales_7d_raw: number;
  revenue_7d: string;
  total_sales: string;
  total_sales_raw: number;
  total_revenue: string;
  associated_influencers: number;
  shop_type: 'crossborder' | 'local';
  product_type: 'new' | 'free_shipping' | 'local_warehouse' | 'hot';
  status: 'active' | 'inactive';
}

// ── 静态爆款商品池 ────────────────────────────────────────────────────────
const MOCK_SELECTION_POOL: SelectableProduct[] = [
  // 马来西亚 🇲🇾 (5 items)
  {
    id: "sp-my-3",
    name: "[NIVEA] Extra Bright C&E Vitamin Lotion 320ml",
    category: "美妆个护",
    original_price: 35.00,
    sale_price: 22.90,
    currency: "RM",
    country: "马来西亚",
    country_flag: "🇲🇾",
    rating: 4.8,
    commission_rate: 10,
    stock: 12400,
    cover_image: "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?w=200",
    shop_name: "Nivea Official Store",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "340.50万",
    influencer_rate: "88%",
    trend_data: [80, 85, 92, 98, 110, 115, 120],
    sales_7d: "8.40万",
    sales_7d_raw: 84000,
    revenue_7d: "RM192.36万 ($41.80万)",
    total_sales: "312.00万",
    total_sales_raw: 3120000,
    total_revenue: "RM714.48万 ($155.30万)",
    associated_influencers: 2100,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-my-4",
    name: "Wireless Bluetooth Earbuds TWS i12 Noise Reduction",
    category: "手机与数码",
    original_price: 49.00,
    sale_price: 15.80,
    currency: "RM",
    country: "马来西亚",
    country_flag: "🇲🇾",
    rating: 4.5,
    commission_rate: 15,
    stock: 18900,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechZone MY",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "410.20万",
    influencer_rate: "92%",
    trend_data: [110, 115, 120, 128, 135, 140, 148],
    sales_7d: "11.20万",
    sales_7d_raw: 112000,
    revenue_7d: "RM176.96万 ($38.40万)",
    total_sales: "420.00万",
    total_sales_raw: 4200000,
    total_revenue: "RM663.60万 ($144.20万)",
    associated_influencers: 3400,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },


  // 美国 🇺🇸 (5 items)
  {
    id: "sp-us-1",
    name: "[Anua] Heartleaf 77% Soothing Toner 250ml",
    category: "美妆个护",
    original_price: 25.00,
    sale_price: 18.50,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.8,
    commission_rate: 15,
    stock: 5400,
    cover_image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200",
    shop_name: "Anua Official Store",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "124.50万",
    influencer_rate: "85%",
    trend_data: [50, 65, 70, 75, 80, 95, 102],
    sales_7d: "4.25万",
    sales_7d_raw: 42500,
    revenue_7d: "$78.62万",
    total_sales: "88.40万",
    total_sales_raw: 884000,
    total_revenue: "$1635.40万",
    associated_influencers: 1250,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-us-2",
    name: "Stanley Quencher H2.0 FlowState Tumbler 40oz stainless steel",
    category: "厨房用品",
    original_price: 45.00,
    sale_price: 35.00,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.9,
    commission_rate: 12,
    stock: 8900,
    cover_image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200",
    shop_name: "Stanley US Store",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "240.00万",
    influencer_rate: "94%",
    trend_data: [90, 95, 105, 110, 120, 135, 142],
    sales_7d: "9.80万",
    sales_7d_raw: 98000,
    revenue_7d: "$343.00万",
    total_sales: "150.00万",
    total_sales_raw: 1500000,
    total_revenue: "$5250.00万",
    associated_influencers: 3800,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-us-3",
    name: "COSRX Advanced Snail 96 Mucin Power Essence 100ml",
    category: "美妆个护",
    original_price: 23.00,
    sale_price: 14.99,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.7,
    commission_rate: 18,
    stock: 15000,
    cover_image: "https://images.unsplash.com/photo-1608248597260-6579054700d1?w=200",
    shop_name: "COSRX US Direct",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "310.20万",
    influencer_rate: "91%",
    trend_data: [120, 125, 130, 138, 145, 150, 160],
    sales_7d: "12.40万",
    sales_7d_raw: 124000,
    revenue_7d: "$185.87万",
    total_sales: "230.00万",
    total_sales_raw: 2300000,
    total_revenue: "$3447.70万",
    associated_influencers: 4900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-us-4",
    name: "Seamless High Waisted Workout Leggings for Women",
    category: "女装与女士内衣",
    original_price: 32.00,
    sale_price: 16.99,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.6,
    commission_rate: 20,
    stock: 9800,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "GymFit Activewear",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "185.40万",
    influencer_rate: "89%",
    trend_data: [70, 75, 80, 88, 92, 98, 105],
    sales_7d: "7.60万",
    sales_7d_raw: 76000,
    revenue_7d: "$129.12万",
    total_sales: "110.00万",
    total_sales_raw: 1100000,
    total_revenue: "$1868.90万",
    associated_influencers: 2600,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-us-5",
    name: "Portable Mini Neck Fan 360 Cooling Hands Free USB",
    category: "居家日用",
    original_price: 29.99,
    sale_price: 12.99,
    currency: "$",
    country: "美国",
    country_flag: "🇺🇸",
    rating: 4.7,
    commission_rate: 15,
    stock: 22000,
    cover_image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=200",
    shop_name: "CoolBreeze Tech",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "290.00万",
    influencer_rate: "93%",
    trend_data: [140, 145, 150, 158, 165, 175, 185],
    sales_7d: "15.30万",
    sales_7d_raw: 153000,
    revenue_7d: "$198.74万",
    total_sales: "190.00万",
    total_sales_raw: 1900000,
    total_revenue: "$2468.10万",
    associated_influencers: 5200,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 印度尼西亚 🇮🇩 (5 items)
  {
    id: "sp-id-1",
    name: "Indomie Mi Goreng Instant Fried Noodles 80g x 5 Packs",
    category: "食品饮料",
    original_price: 20000,
    sale_price: 15500,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.9,
    commission_rate: 3,
    stock: 120000,
    cover_image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200",
    shop_name: "Indomie Official Store",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "1540.30万",
    influencer_rate: "45%",
    trend_data: [200, 220, 210, 230, 225, 240, 245],
    sales_7d: "45.20万",
    sales_7d_raw: 452000,
    revenue_7d: "Rp70.06亿 ($45.20万)",
    total_sales: "1280.00万",
    total_sales_raw: 12800000,
    total_revenue: "Rp1984.00亿 ($1280.00万)",
    associated_influencers: 9400,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-id-2",
    name: "Garnier Bright Complete Vitamin C Serum 30ml Skin Care",
    category: "美妆个护",
    original_price: 125000,
    sale_price: 89000,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.8,
    commission_rate: 10,
    stock: 45000,
    cover_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200",
    shop_name: "Garnier Indonesia",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "820.50万",
    influencer_rate: "87%",
    trend_data: [180, 190, 195, 205, 210, 220, 228],
    sales_7d: "22.30万",
    sales_7d_raw: 223000,
    revenue_7d: "Rp198.47亿 ($128.00万)",
    total_sales: "640.00万",
    total_sales_raw: 6400000,
    total_revenue: "Rp5696.00亿 ($3674.80万)",
    associated_influencers: 6300,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-id-3",
    name: "SKINTIFIC 5X Ceramide Barrier Repair Moisture Gel 30g",
    category: "美妆个护",
    original_price: 169000,
    sale_price: 135000,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.9,
    commission_rate: 15,
    stock: 58000,
    cover_image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200",
    shop_name: "SKINTIFIC Official",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "1150.00万",
    influencer_rate: "96%",
    trend_data: [250, 265, 270, 285, 290, 305, 315],
    sales_7d: "31.50万",
    sales_7d_raw: 315000,
    revenue_7d: "Rp425.25亿 ($274.30万)",
    total_sales: "980.00万",
    total_sales_raw: 9800000,
    total_revenue: "Rp13230.00亿 ($8535.50万)",
    associated_influencers: 11200,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-id-4",
    name: "Kemeja Casual Pria Lengan Pendek Cotton Premium",
    category: "男装与男士内衣",
    original_price: 150000,
    sale_price: 69000,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.7,
    commission_rate: 12,
    stock: 32000,
    cover_image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200",
    shop_name: "ManStyle ID",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "490.00万",
    influencer_rate: "88%",
    trend_data: [130, 135, 142, 150, 158, 162, 168],
    sales_7d: "16.80万",
    sales_7d_raw: 168000,
    revenue_7d: "Rp115.92亿 ($74.70万)",
    total_sales: "380.00万",
    total_sales_raw: 3800000,
    total_revenue: "Rp2622.00亿 ($1691.60万)",
    associated_influencers: 4500,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-id-5",
    name: "Sandal Flip Flop Wanita Anti Slip Soft Sponge Cushion",
    category: "时尚配件",
    original_price: 60000,
    sale_price: 24900,
    currency: "Rp",
    country: "印度尼西亚",
    country_flag: "🇮🇩",
    rating: 4.6,
    commission_rate: 8,
    stock: 65000,
    cover_image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200",
    shop_name: "FootwearID",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "680.00万",
    influencer_rate: "91%",
    trend_data: [210, 220, 230, 245, 255, 270, 284],
    sales_7d: "28.40万",
    sales_7d_raw: 284000,
    revenue_7d: "Rp70.71亿 ($45.60万)",
    total_sales: "520.00万",
    total_sales_raw: 5200000,
    total_revenue: "Rp1294.80亿 ($835.30万)",
    associated_influencers: 7800,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 英国 🇬🇧 (5 items)
  {
    id: "sp-gb-1",
    name: "Maybelline Lash Sensational Sky High Mascara Black",
    category: "美妆个护",
    original_price: 11.99,
    sale_price: 8.49,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.8,
    commission_rate: 14,
    stock: 12000,
    cover_image: "https://images.unsplash.com/photo-1631730486784-5456119f69ae?w=200",
    shop_name: "Maybelline UK Store",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "140.50万",
    influencer_rate: "92%",
    trend_data: [45, 48, 50, 52, 54, 58, 62],
    sales_7d: "5.40万",
    sales_7d_raw: 54000,
    revenue_7d: "£45.84万",
    total_sales: "92.00万",
    total_sales_raw: 920000,
    total_revenue: "£781.08万",
    associated_influencers: 1850,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-gb-2",
    name: "The Ordinary Niacinamide 10% + Zinc 1% High-Strength Serum",
    category: "美妆个护",
    original_price: 6.00,
    sale_price: 5.00,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.9,
    commission_rate: 10,
    stock: 25000,
    cover_image: "https://images.unsplash.com/photo-1608248597260-6579054700d1?w=200",
    shop_name: "DECIEM UK",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "280.00万",
    influencer_rate: "88%",
    trend_data: [75, 78, 80, 84, 86, 89, 92],
    sales_7d: "8.90万",
    sales_7d_raw: 89000,
    revenue_7d: "£44.50万",
    total_sales: "185.00万",
    total_sales_raw: 1850000,
    total_revenue: "£925.00万",
    associated_influencers: 3900,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-gb-3",
    name: "Electric Heated Blanket Soft Fleece Single/Double Controls",
    category: "居家日用",
    original_price: 39.99,
    sale_price: 24.99,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.7,
    commission_rate: 16,
    stock: 7500,
    cover_image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=200",
    shop_name: "CozyHome UK",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "95.00万",
    influencer_rate: "86%",
    trend_data: [25, 28, 30, 31, 32, 34, 36],
    sales_7d: "3.20万",
    sales_7d_raw: 32000,
    revenue_7d: "£79.96万",
    total_sales: "64.00万",
    total_sales_raw: 640000,
    total_revenue: "£1599.36万",
    associated_influencers: 1450,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-gb-4",
    name: "Women High Waist Seamless Gym Leggings Contour Fit",
    category: "女装与女士内衣",
    original_price: 22.00,
    sale_price: 12.99,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.6,
    commission_rate: 18,
    stock: 14000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "FlexFit UK",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "160.00万",
    influencer_rate: "90%",
    trend_data: [55, 58, 60, 62, 64, 67, 70],
    sales_7d: "6.70万",
    sales_7d_raw: 67000,
    revenue_7d: "£87.03万",
    total_sales: "115.00万",
    total_sales_raw: 1150000,
    total_revenue: "£1493.85万",
    associated_influencers: 2800,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-gb-5",
    name: "Stainless Steel Insulated Thermal Water Bottle 500ml",
    category: "厨房用品",
    original_price: 16.99,
    sale_price: 9.99,
    currency: "£",
    country: "英国",
    country_flag: "🇬🇧",
    rating: 4.8,
    commission_rate: 12,
    stock: 19000,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "EcoDrink UK",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "120.00万",
    influencer_rate: "87%",
    trend_data: [38, 40, 42, 44, 46, 48, 51],
    sales_7d: "4.80万",
    sales_7d_raw: 48000,
    revenue_7d: "£47.95万",
    total_sales: "85.00万",
    total_sales_raw: 850000,
    total_revenue: "£849.15万",
    associated_influencers: 1900,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 越南 🇻🇳 (5 items)
  {
    id: "sp-vn-1",
    name: "Kem Chống Nắng Anessa Perfect UV Sunscreen Skincare Milk 60ml",
    category: "美妆个护",
    original_price: 650000,
    sale_price: 485000,
    currency: "₫",
    country: "越南",
    country_flag: "🇻🇳",
    rating: 4.9,
    commission_rate: 12,
    stock: 28000,
    cover_image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200",
    shop_name: "Anessa Official VN",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "450.00万",
    influencer_rate: "93%",
    trend_data: [100, 105, 110, 115, 120, 125, 130],
    sales_7d: "12.50万",
    sales_7d_raw: 125000,
    revenue_7d: "₫606.25亿 ($242.00万)",
    total_sales: "340.00万",
    total_sales_raw: 3400000,
    total_revenue: "₫16490.00亿 ($6596.00万)",
    associated_influencers: 4200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-vn-2",
    name: "Son Kem Lì Black Rouge Air Fit Velvet Tint A12",
    category: "美妆个护",
    original_price: 220000,
    sale_price: 139000,
    currency: "₫",
    country: "越南",
    country_flag: "🇻🇳",
    rating: 4.8,
    commission_rate: 15,
    stock: 42000,
    cover_image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200",
    shop_name: "Black Rouge VN",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "780.00万",
    influencer_rate: "95%",
    trend_data: [160, 168, 175, 182, 190, 195, 202],
    sales_7d: "19.80万",
    sales_7d_raw: 198000,
    revenue_7d: "₫275.22亿 ($110.00万)",
    total_sales: "620.00万",
    total_sales_raw: 6200000,
    total_revenue: "₫8618.00亿 ($3447.20万)",
    associated_influencers: 7100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-vn-3",
    name: "Áo Thun Form Rộng Unisex Tay Lỡ Cotton 100%",
    category: "女装与女士内衣",
    original_price: 180000,
    sale_price: 79000,
    currency: "₫",
    country: "越南",
    country_flag: "🇻🇳",
    rating: 4.7,
    commission_rate: 10,
    stock: 55000,
    cover_image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200",
    shop_name: "LocalBrand VN",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "690.00万",
    influencer_rate: "89%",
    trend_data: [210, 220, 228, 235, 242, 250, 258],
    sales_7d: "25.40万",
    sales_7d_raw: 254000,
    revenue_7d: "₫200.66亿 ($80.20万)",
    total_sales: "510.00万",
    total_sales_raw: 5100000,
    total_revenue: "₫4029.00亿 ($1611.60万)",
    associated_influencers: 6400,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-vn-4",
    name: "Tai Nghe Không Dây Bluetooth 5.3 Chống Nước IPX5",
    category: "手机与数码",
    original_price: 350000,
    sale_price: 149000,
    currency: "₫",
    country: "越南",
    country_flag: "🇻🇳",
    rating: 4.6,
    commission_rate: 18,
    stock: 31000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechMaster VN",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "390.00万",
    influencer_rate: "92%",
    trend_data: [115, 120, 126, 132, 138, 142, 148],
    sales_7d: "14.20万",
    sales_7d_raw: 142000,
    revenue_7d: "₫211.58亿 ($84.60万)",
    total_sales: "290.00万",
    total_sales_raw: 2900000,
    total_revenue: "₫4321.00亿 ($1728.40万)",
    associated_influencers: 3900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-vn-5",
    name: "Khăn Mặt Sợi Bông Cao Cấp Thấm Hút Tốt (Combo 3 Cái)",
    category: "居家日用",
    original_price: 95000,
    sale_price: 45000,
    currency: "₫",
    country: "越南",
    country_flag: "🇻🇳",
    rating: 4.8,
    commission_rate: 8,
    stock: 68000,
    cover_image: "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=200",
    shop_name: "HomeCare VN",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "820.00万",
    influencer_rate: "90%",
    trend_data: [260, 270, 280, 292, 305, 315, 325],
    sales_7d: "32.10万",
    sales_7d_raw: 321000,
    revenue_7d: "₫144.45亿 ($57.70万)",
    total_sales: "680.00万",
    total_sales_raw: 6800000,
    total_revenue: "₫3060.00亿 ($1224.00万)",
    associated_influencers: 8200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 泰国 🇹🇭 (5 items)
  {
    id: "sp-th-1",
    name: "Mistine Super Model Miracle Lash Mascara 5.5g Waterproof",
    category: "美妆个护",
    original_price: 250,
    sale_price: 139,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.8,
    commission_rate: 14,
    stock: 35000,
    cover_image: "https://images.unsplash.com/photo-1631730486784-5456119f69ae?w=200",
    shop_name: "Mistine Official TH",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "580.00万",
    influencer_rate: "94%",
    trend_data: [145, 152, 160, 168, 175, 180, 188],
    sales_7d: "18.40万",
    sales_7d_raw: 184000,
    revenue_7d: "฿255.76万 ($7.30万)",
    total_sales: "480.00万",
    total_sales_raw: 4800000,
    total_revenue: "฿6672.00万 ($190.60万)",
    associated_influencers: 5600,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-th-2",
    name: "Cathy Doll Speed White CC Cream SPF50 PA+++ 50ml",
    category: "美妆个护",
    original_price: 390,
    sale_price: 245,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.7,
    commission_rate: 12,
    stock: 22000,
    cover_image: "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?w=200",
    shop_name: "Karmarts TH",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "340.00万",
    influencer_rate: "90%",
    trend_data: [90, 95, 100, 105, 110, 112, 118],
    sales_7d: "11.60万",
    sales_7d_raw: 116000,
    revenue_7d: "฿284.20万 ($8.10万)",
    total_sales: "290.00万",
    total_sales_raw: 2900000,
    total_revenue: "฿7105.00万 ($203.00万)",
    associated_influencers: 3400,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-th-3",
    name: "กางเกงขายาวขากว้าง สไตล์เกาหลี ผ้าเด้งทรงสวย ใส่สบาย",
    category: "女装与女士内衣",
    original_price: 290,
    sale_price: 119,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.6,
    commission_rate: 15,
    stock: 45000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "Fashionista TH",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "620.00万",
    influencer_rate: "91%",
    trend_data: [180, 188, 195, 205, 212, 220, 228],
    sales_7d: "22.50万",
    sales_7d_raw: 225000,
    revenue_7d: "฿267.75万 ($7.60万)",
    total_sales: "510.00万",
    total_sales_raw: 5100000,
    total_revenue: "฿6069.00万 ($173.40万)",
    associated_influencers: 6100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-th-4",
    name: "พัดลมพกพา ชาร์จ USB ลมแรง ปรับได้ 3 ระดับ เสียงเงียบ",
    category: "居家日用",
    original_price: 199,
    sale_price: 79,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.7,
    commission_rate: 10,
    stock: 68000,
    cover_image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=200",
    shop_name: "GadgetStore TH",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "890.00万",
    influencer_rate: "93%",
    trend_data: [280, 290, 305, 318, 330, 342, 355],
    sales_7d: "35.20万",
    sales_7d_raw: 352000,
    revenue_7d: "฿278.08万 ($7.90万)",
    total_sales: "720.00万",
    total_sales_raw: 7200000,
    total_revenue: "฿5688.00万 ($162.50万)",
    associated_influencers: 8900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-th-5",
    name: "กระเป๋าสะพายข้างผู้หญิง ทรงทราเปซ หนัง PU Premium",
    category: "时尚配件",
    original_price: 450,
    sale_price: 189,
    currency: "฿",
    country: "泰国",
    country_flag: "🇹🇭",
    rating: 4.8,
    commission_rate: 16,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200",
    shop_name: "BagGallery TH",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "260.00万",
    influencer_rate: "88%",
    trend_data: [75, 78, 82, 86, 89, 91, 95],
    sales_7d: "9.40万",
    sales_7d_raw: 94000,
    revenue_7d: "฿177.66万 ($5.00万)",
    total_sales: "210.00万",
    total_sales_raw: 2100000,
    total_revenue: "฿3969.00万 ($113.40万)",
    associated_influencers: 2500,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },

  // 菲律宾 🇵🇭 (5 items)
  {
    id: "sp-ph-1",
    name: "Dazzle Me Ink-Matte Lip Tint Long Lasting 2.5g Lip Stain",
    category: "美妆个护",
    original_price: 199,
    sale_price: 99,
    currency: "₱",
    country: "菲律宾",
    country_flag: "🇵🇭",
    rating: 4.8,
    commission_rate: 15,
    stock: 52000,
    cover_image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200",
    shop_name: "Dazzle Me Official",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "950.00万",
    influencer_rate: "95%",
    trend_data: [230, 240, 252, 265, 275, 282, 291],
    sales_7d: "28.90万",
    sales_7d_raw: 289000,
    revenue_7d: "₱286.11万 ($5.10万)",
    total_sales: "780.00万",
    total_sales_raw: 7800000,
    total_revenue: "₱7722.00万 ($137.90万)",
    associated_influencers: 8900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-ph-2",
    name: "Y.O.U Beauty Acneplus Spot Care Treatment Gel 15g",
    category: "美妆个护",
    original_price: 299,
    sale_price: 179,
    currency: "₱",
    country: "菲律宾",
    country_flag: "🇵🇭",
    rating: 4.7,
    commission_rate: 12,
    stock: 29000,
    cover_image: "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=200",
    shop_name: "Y.O.U Beauty PH",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "410.00万",
    influencer_rate: "89%",
    trend_data: [110, 115, 122, 130, 138, 142, 148],
    sales_7d: "14.50万",
    sales_7d_raw: 145000,
    revenue_7d: "₱259.55万 ($4.60万)",
    total_sales: "340.00万",
    total_sales_raw: 3400000,
    total_revenue: "₱6086.00万 ($108.70万)",
    associated_influencers: 3800,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-ph-3",
    name: "High Waist Seamless Cycling Shorts for Women Workout",
    category: "女装与女士内衣",
    original_price: 250,
    sale_price: 89,
    currency: "₱",
    country: "菲律宾",
    country_flag: "🇵🇭",
    rating: 4.6,
    commission_rate: 18,
    stock: 61000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "TrendyFit PH",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "820.00万",
    influencer_rate: "92%",
    trend_data: [250, 262, 275, 288, 298, 305, 315],
    sales_7d: "31.20万",
    sales_7d_raw: 312000,
    revenue_7d: "₱277.68万 ($4.90万)",
    total_sales: "690.00万",
    total_sales_raw: 6900000,
    total_revenue: "₱6141.00万 ($109.70万)",
    associated_influencers: 7600,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-ph-4",
    name: "Heavy Duty Anti Theft Canvas Backpack Waterproof USB",
    category: "时尚配件",
    original_price: 599,
    sale_price: 269,
    currency: "₱",
    country: "菲律宾",
    country_flag: "🇵🇭",
    rating: 4.7,
    commission_rate: 10,
    stock: 17000,
    cover_image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200",
    shop_name: "BagCity PH",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "240.00万",
    influencer_rate: "87%",
    trend_data: [68, 72, 75, 78, 82, 85, 89],
    sales_7d: "8.70万",
    sales_7d_raw: 87000,
    revenue_7d: "₱234.03万 ($4.10万)",
    total_sales: "190.00万",
    total_sales_raw: 1900000,
    total_revenue: "₱5111.00万 ($91.30万)",
    associated_influencers: 2200,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-ph-5",
    name: "Mini Portable Electric Juicer Blender USB 400ml 6 Blades",
    category: "厨房用品",
    original_price: 499,
    sale_price: 199,
    currency: "₱",
    country: "菲律宾",
    country_flag: "🇵🇭",
    rating: 4.8,
    commission_rate: 15,
    stock: 38000,
    cover_image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200",
    shop_name: "HomeAppliance PH",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "490.00万",
    influencer_rate: "91%",
    trend_data: [130, 138, 145, 152, 158, 162, 168],
    sales_7d: "16.40万",
    sales_7d_raw: 164000,
    revenue_7d: "₱326.36万 ($5.80万)",
    total_sales: "380.00万",
    total_sales_raw: 3800000,
    total_revenue: "₱7562.00万 ($135.00万)",
    associated_influencers: 4500,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 西班牙 🇪🇸 (5 items)
  {
    id: "sp-es-1",
    name: "Sérum Facial Niacinamida 10% Antimanchas Iluminador 30ml",
    category: "美妆个护",
    original_price: 18.99,
    sale_price: 9.99,
    currency: "€",
    country: "西班牙",
    country_flag: "🇪🇸",
    rating: 4.7,
    commission_rate: 14,
    stock: 11000,
    cover_image: "https://images.unsplash.com/photo-1608248597260-6579054700d1?w=200",
    shop_name: "BellaPiel España",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "85.00万",
    influencer_rate: "88%",
    trend_data: [28, 30, 31, 32, 33, 34, 35],
    sales_7d: "3.40万",
    sales_7d_raw: 34000,
    revenue_7d: "€33.96万",
    total_sales: "58.00万",
    total_sales_raw: 580000,
    total_revenue: "€579.42万",
    associated_influencers: 1200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-es-2",
    name: "Leggings Deportivos Cintura Alta Compresión Mujer Gym",
    category: "女装与女士内衣",
    original_price: 25.00,
    sale_price: 14.99,
    currency: "€",
    country: "西班牙",
    country_flag: "🇪🇸",
    rating: 4.6,
    commission_rate: 16,
    stock: 15000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "SportVida ES",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "110.00万",
    influencer_rate: "90%",
    trend_data: [38, 40, 42, 44, 46, 47, 49],
    sales_7d: "4.80万",
    sales_7d_raw: 48000,
    revenue_7d: "€71.95万",
    total_sales: "79.00万",
    total_sales_raw: 790000,
    total_revenue: "€1184.21万",
    associated_influencers: 1800,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-es-3",
    name: "Auriculares Inalámbricos Bluetooth 5.3 Con Micrófono HD",
    category: "手机与数码",
    original_price: 39.99,
    sale_price: 19.99,
    currency: "€",
    country: "西班牙",
    country_flag: "🇪🇸",
    rating: 4.8,
    commission_rate: 18,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechSpain Direct",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "145.00万",
    influencer_rate: "92%",
    trend_data: [50, 52, 55, 58, 60, 61, 63],
    sales_7d: "6.20万",
    sales_7d_raw: 62000,
    revenue_7d: "€123.93万",
    total_sales: "105.00万",
    total_sales_raw: 1050000,
    total_revenue: "€2098.95万",
    associated_influencers: 2600,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-es-4",
    name: "Botella Térmica de Acero Inoxidable 750ml Libre BPA",
    category: "厨房用品",
    original_price: 19.99,
    sale_price: 11.50,
    currency: "€",
    country: "西班牙",
    country_flag: "🇪🇸",
    rating: 4.7,
    commission_rate: 10,
    stock: 9500,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "EcoVasos ES",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "72.00万",
    influencer_rate: "86%",
    trend_data: [22, 24, 25, 26, 27, 28, 30],
    sales_7d: "2.90万",
    sales_7d_raw: 29000,
    revenue_7d: "€33.35万",
    total_sales: "48.00万",
    total_sales_raw: 480000,
    total_revenue: "€552.00万",
    associated_influencers: 1100,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-es-5",
    name: "Organizador de Maquillaje Acrílico Giratorio 360° Gran Capacidad",
    category: "居家日用",
    original_price: 29.99,
    sale_price: 16.80,
    currency: "€",
    country: "西班牙",
    country_flag: "🇪🇸",
    rating: 4.8,
    commission_rate: 12,
    stock: 14000,
    cover_image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200",
    shop_name: "HogarModerno ES",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "125.00万",
    influencer_rate: "89%",
    trend_data: [40, 42, 44, 46, 48, 50, 52],
    sales_7d: "5.10万",
    sales_7d_raw: 51000,
    revenue_7d: "€85.68万",
    total_sales: "88.00万",
    total_sales_raw: 880000,
    total_revenue: "€1478.40万",
    associated_influencers: 2100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 墨西哥 🇲🇽 (5 items)
  {
    id: "sp-mx-1",
    name: "Sérum Ácido Hialurónico + Vitamina C Hidratante Anti-Arrugas 30ml",
    category: "美妆个护",
    original_price: 399,
    sale_price: 199,
    currency: "Mex$",
    country: "墨西哥",
    country_flag: "🇲🇽",
    rating: 4.8,
    commission_rate: 15,
    stock: 24000,
    cover_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200",
    shop_name: "PielSana México",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "210.00万",
    influencer_rate: "91%",
    trend_data: [65, 70, 75, 79, 82, 84, 87],
    sales_7d: "8.50万",
    sales_7d_raw: 85000,
    revenue_7d: "Mex$1691.50万 ($93.90万)",
    total_sales: "140.00万",
    total_sales_raw: 1400000,
    total_revenue: "Mex$2.78亿 ($1547.00万)",
    associated_influencers: 3100,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-mx-2",
    name: "Audífonos Inalámbricos Bluetooth TWS Cancela Ruido Manos Libres",
    category: "手机与数码",
    original_price: 499,
    sale_price: 249,
    currency: "Mex$",
    country: "墨西哥",
    country_flag: "🇲🇽",
    rating: 4.7,
    commission_rate: 18,
    stock: 35000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "AudioTech MX",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "340.00万",
    influencer_rate: "93%",
    trend_data: [98, 104, 110, 115, 119, 122, 126],
    sales_7d: "12.30万",
    sales_7d_raw: 123000,
    revenue_7d: "Mex$3062.70万 ($170.10万)",
    total_sales: "240.00万",
    total_sales_raw: 2400000,
    total_revenue: "Mex$5.97亿 ($3319.00万)",
    associated_influencers: 4800,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-mx-3",
    name: "Leggings Deportivos Push Up Tiro Alto Damas Control Abdomen",
    category: "女装与女士内衣",
    original_price: 350,
    sale_price: 169,
    currency: "Mex$",
    country: "墨西哥",
    country_flag: "🇲🇽",
    rating: 4.6,
    commission_rate: 16,
    stock: 42000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "FitnessMX",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "410.00万",
    influencer_rate: "90%",
    trend_data: [120, 128, 134, 142, 148, 152, 157],
    sales_7d: "15.40万",
    sales_7d_raw: 154000,
    revenue_7d: "Mex$2602.60万 ($144.50万)",
    total_sales: "310.00万",
    total_sales_raw: 3100000,
    total_revenue: "Mex$5.23亿 ($2910.00万)",
    associated_influencers: 5200,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-mx-4",
    name: "Mochila Antirrobo Impermeable Puerto USB Laptop Viaje",
    category: "时尚配件",
    original_price: 699,
    sale_price: 329,
    currency: "Mex$",
    country: "墨西哥",
    country_flag: "🇲🇽",
    rating: 4.8,
    commission_rate: 12,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200",
    shop_name: "MochilasMX",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "190.00万",
    influencer_rate: "87%",
    trend_data: [50, 54, 58, 61, 64, 66, 69],
    sales_7d: "6.80万",
    sales_7d_raw: 68000,
    revenue_7d: "Mex$2237.20万 ($124.20万)",
    total_sales: "130.00万",
    total_sales_raw: 1300000,
    total_revenue: "Mex$4.27亿 ($2376.00万)",
    associated_influencers: 2400,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-mx-5",
    name: "Licuadora Portátil Recargable USB 6 Navajas 400ml",
    category: "厨房用品",
    original_price: 450,
    sale_price: 219,
    currency: "Mex$",
    country: "墨西哥",
    country_flag: "🇲🇽",
    rating: 4.7,
    commission_rate: 14,
    stock: 26000,
    cover_image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200",
    shop_name: "CocinaFácil MX",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "250.00万",
    influencer_rate: "89%",
    trend_data: [70, 75, 79, 83, 87, 89, 93],
    sales_7d: "9.10万",
    sales_7d_raw: 91000,
    revenue_7d: "Mex$1992.90万 ($110.70万)",
    total_sales: "170.00万",
    total_sales_raw: 1700000,
    total_revenue: "Mex$3.72亿 ($2068.00万)",
    associated_influencers: 3300,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 德国 🇩🇪 (5 items)
  {
    id: "sp-de-1",
    name: "Balea Hyaluron Serum Intensive Feuchtigkeit 30ml Anti-Falten",
    category: "美妆个护",
    original_price: 12.99,
    sale_price: 7.99,
    currency: "€",
    country: "德国",
    country_flag: "🇩🇪",
    rating: 4.8,
    commission_rate: 12,
    stock: 22000,
    cover_image: "https://images.unsplash.com/photo-1608248597260-6579054700d1?w=200",
    shop_name: "dm-drogerie markt",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "240.00万",
    influencer_rate: "91%",
    trend_data: [60, 62, 65, 68, 71, 74, 78],
    sales_7d: "7.80万",
    sales_7d_raw: 78000,
    revenue_7d: "€62.32万",
    total_sales: "160.00万",
    total_sales_raw: 1600000,
    total_revenue: "€1278.40万",
    associated_influencers: 3100,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-de-2",
    name: "Sporthose Damen High Waist Yoga Leggings Blickdicht",
    category: "女装与女士内衣",
    original_price: 29.99,
    sale_price: 17.99,
    currency: "€",
    country: "德国",
    country_flag: "🇩🇪",
    rating: 4.7,
    commission_rate: 15,
    stock: 14000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "ActiveFit Deutschland",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "135.00万",
    influencer_rate: "88%",
    trend_data: [40, 42, 44, 46, 48, 50, 53],
    sales_7d: "5.20万",
    sales_7d_raw: 52000,
    revenue_7d: "€93.54万",
    total_sales: "95.00万",
    total_sales_raw: 950000,
    total_revenue: "€1709.05万",
    associated_influencers: 2100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-de-3",
    name: "In-Ear Ohrhörer Bluetooth 5.3 Sport Wireless Headphones IPX7",
    category: "手机与数码",
    original_price: 49.99,
    sale_price: 22.99,
    currency: "€",
    country: "德国",
    country_flag: "🇩🇪",
    rating: 4.8,
    commission_rate: 18,
    stock: 19000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "SoundGear DE",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "190.00万",
    influencer_rate: "93%",
    trend_data: [68, 71, 74, 77, 80, 83, 87],
    sales_7d: "8.60万",
    sales_7d_raw: 86000,
    revenue_7d: "€197.71万",
    total_sales: "140.00万",
    total_sales_raw: 1400000,
    total_revenue: "€3218.60万",
    associated_influencers: 3400,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-de-4",
    name: "Edelstahl Thermosflasche 1000ml Doppelwandig Vakuumisoliert",
    category: "厨房用品",
    original_price: 24.99,
    sale_price: 14.99,
    currency: "€",
    country: "德国",
    country_flag: "🇩🇪",
    rating: 4.9,
    commission_rate: 10,
    stock: 11000,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "TrinkKultur DE",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "95.00万",
    influencer_rate: "86%",
    trend_data: [30, 32, 34, 36, 38, 39, 41],
    sales_7d: "4.10万",
    sales_7d_raw: 41000,
    revenue_7d: "€61.45万",
    total_sales: "68.00万",
    total_sales_raw: 680000,
    total_revenue: "€1019.32万",
    associated_influencers: 1500,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-de-5",
    name: "LED Schreibtischlampe Dimmbar mit USB Ladeanschluss Touch",
    category: "居家日用",
    original_price: 34.99,
    sale_price: 19.99,
    currency: "€",
    country: "德国",
    country_flag: "🇩🇪",
    rating: 4.7,
    commission_rate: 14,
    stock: 16000,
    cover_image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200",
    shop_name: "LichtDesign DE",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "150.00万",
    influencer_rate: "90%",
    trend_data: [48, 50, 53, 56, 58, 60, 64],
    sales_7d: "6.30万",
    sales_7d_raw: 63000,
    revenue_7d: "€125.93万",
    total_sales: "110.00万",
    total_sales_raw: 1100000,
    total_revenue: "€2198.90万",
    associated_influencers: 2600,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 法国 🇫🇷 (5 items)
  {
    id: "sp-fr-1",
    name: "La Roche-Posay Effaclar Duo+ Soin Anti-Imperfections 40ml",
    category: "美妆个护",
    original_price: 19.50,
    sale_price: 14.90,
    currency: "€",
    country: "法国",
    country_flag: "🇫🇷",
    rating: 4.9,
    commission_rate: 10,
    stock: 26000,
    cover_image: "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?w=200",
    shop_name: "Pharmacie Paris",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "310.00万",
    influencer_rate: "92%",
    trend_data: [72, 75, 78, 81, 84, 88, 93],
    sales_7d: "9.20万",
    sales_7d_raw: 92000,
    revenue_7d: "€137.08万",
    total_sales: "210.00万",
    total_sales_raw: 2100000,
    total_revenue: "€3129.00万",
    associated_influencers: 4200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-fr-2",
    name: "Legging Sport Femme Taille Haute Effet Push-Up Sculptant",
    category: "女装与女士内衣",
    original_price: 27.99,
    sale_price: 15.99,
    currency: "€",
    country: "法国",
    country_flag: "🇫🇷",
    rating: 4.7,
    commission_rate: 16,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "EleganceFit FR",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "175.00万",
    influencer_rate: "89%",
    trend_data: [50, 52, 54, 57, 59, 61, 65],
    sales_7d: "6.40万",
    sales_7d_raw: 64000,
    revenue_7d: "€102.33万",
    total_sales: "125.00万",
    total_sales_raw: 1250000,
    total_revenue: "€1998.75万",
    associated_influencers: 2800,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-fr-3",
    name: "Écouteurs Sans Fil Bluetooth 5.3 Réduction de Bruit Active",
    category: "手机与数码",
    original_price: 45.00,
    sale_price: 21.90,
    currency: "€",
    country: "法国",
    country_flag: "🇫🇷",
    rating: 4.8,
    commission_rate: 18,
    stock: 21000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechFrance Direct",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "210.00万",
    influencer_rate: "94%",
    trend_data: [62, 65, 68, 71, 74, 76, 80],
    sales_7d: "7.90万",
    sales_7d_raw: 79000,
    revenue_7d: "€173.01万",
    total_sales: "155.00万",
    total_sales_raw: 1550000,
    total_revenue: "€3394.50万",
    associated_influencers: 3700,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-fr-4",
    name: "Gourde Isotherme en Acier Inoxydable 500ml Sans BPA",
    category: "厨房用品",
    original_price: 18.99,
    sale_price: 10.99,
    currency: "€",
    country: "法国",
    country_flag: "🇫🇷",
    rating: 4.8,
    commission_rate: 12,
    stock: 14000,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "MaisonÉco FR",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "120.00万",
    influencer_rate: "87%",
    trend_data: [40, 42, 44, 46, 48, 50, 54],
    sales_7d: "5.30万",
    sales_7d_raw: 53000,
    revenue_7d: "€58.24万",
    total_sales: "89.00万",
    total_sales_raw: 890000,
    total_revenue: "€978.11万",
    associated_influencers: 2100,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-fr-5",
    name: "Diffuseur d'Huiles Essentielles Ultrasonique 300ml LED 7 Couleurs",
    category: "居家日用",
    original_price: 32.99,
    sale_price: 18.50,
    currency: "€",
    country: "法国",
    country_flag: "🇫🇷",
    rating: 4.7,
    commission_rate: 15,
    stock: 13000,
    cover_image: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=200",
    shop_name: "AromaZen France",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "110.00万",
    influencer_rate: "89%",
    trend_data: [36, 38, 40, 42, 44, 45, 48],
    sales_7d: "4.70万",
    sales_7d_raw: 47000,
    revenue_7d: "€86.95万",
    total_sales: "78.00万",
    total_sales_raw: 780000,
    total_revenue: "€1443.00万",
    associated_influencers: 1900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 意大利 🇮🇹 (5 items)
  {
    id: "sp-it-1",
    name: "KIKO Milano Smart Hydrating Serum Fondotinta 30ml",
    category: "美妆个护",
    original_price: 14.99,
    sale_price: 9.99,
    currency: "€",
    country: "意大利",
    country_flag: "🇮🇹",
    rating: 4.8,
    commission_rate: 12,
    stock: 32000,
    cover_image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200",
    shop_name: "KIKO Milano IT",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "420.00万",
    influencer_rate: "93%",
    trend_data: [90, 93, 96, 100, 104, 108, 115],
    sales_7d: "11.40万",
    sales_7d_raw: 114000,
    revenue_7d: "€113.88万",
    total_sales: "280.00万",
    total_sales_raw: 2800000,
    total_revenue: "€2797.20万",
    associated_influencers: 5100,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-it-2",
    name: "Leggings Sportivi Donna Vita Alta Traspirante Modellanti",
    category: "女装与女士内衣",
    original_price: 26.90,
    sale_price: 14.50,
    currency: "€",
    country: "意大利",
    country_flag: "🇮🇹",
    rating: 4.7,
    commission_rate: 15,
    stock: 16000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "ModaSport Italia",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "150.00万",
    influencer_rate: "90%",
    trend_data: [45, 47, 49, 51, 53, 55, 59],
    sales_7d: "5.80万",
    sales_7d_raw: 58000,
    revenue_7d: "€84.10万",
    total_sales: "105.00万",
    total_sales_raw: 1050000,
    total_revenue: "€1522.50万",
    associated_influencers: 2400,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-it-3",
    name: "Cuffie Bluetooth 5.3 Senza Fili Sport Waterproof Microfono",
    category: "手机与数码",
    original_price: 39.99,
    sale_price: 18.99,
    currency: "€",
    country: "意大利",
    country_flag: "🇮🇹",
    rating: 4.8,
    commission_rate: 18,
    stock: 22000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "AudioItalia Direct",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "230.00万",
    influencer_rate: "94%",
    trend_data: [64, 67, 70, 73, 76, 78, 82],
    sales_7d: "8.10万",
    sales_7d_raw: 81000,
    revenue_7d: "€153.81万",
    total_sales: "165.00万",
    total_sales_raw: 1650000,
    total_revenue: "€3133.35万",
    associated_influencers: 3800,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-it-4",
    name: "Borraccia Termica Acciaio Inox 500ml Eco Friendly",
    category: "厨房用品",
    original_price: 19.90,
    sale_price: 11.90,
    currency: "€",
    country: "意大利",
    country_flag: "🇮🇹",
    rating: 4.8,
    commission_rate: 10,
    stock: 12000,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "CasaBella IT",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "110.00万",
    influencer_rate: "87%",
    trend_data: [32, 34, 36, 37, 39, 40, 43],
    sales_7d: "4.20万",
    sales_7d_raw: 42000,
    revenue_7d: "€49.98万",
    total_sales: "75.00万",
    total_sales_raw: 750000,
    total_revenue: "€892.50万",
    associated_influencers: 1700,
    shop_type: "local",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-it-5",
    name: "Borsa a Tracolla Donna in Pelle Sintetica Elegante Tracolla",
    category: "时尚配件",
    original_price: 39.90,
    sale_price: 22.50,
    currency: "€",
    country: "意大利",
    country_flag: "🇮🇹",
    rating: 4.7,
    commission_rate: 14,
    stock: 15000,
    cover_image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200",
    shop_name: "MilanoBags IT",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "160.00万",
    influencer_rate: "89%",
    trend_data: [52, 55, 57, 60, 62, 64, 68],
    sales_7d: "6.70万",
    sales_7d_raw: 67000,
    revenue_7d: "€150.75万",
    total_sales: "115.00万",
    total_sales_raw: 1150000,
    total_revenue: "€2587.50万",
    associated_influencers: 2900,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },

  // 巴西 🇧🇷 (5 items)
  {
    id: "sp-br-1",
    name: "Sérum Facial Vitamina C 10% Clareador Anti-Idade 30ml",
    category: "美妆个护",
    original_price: 79.90,
    sale_price: 39.90,
    currency: "R$",
    country: "巴西",
    country_flag: "🇧🇷",
    rating: 4.8,
    commission_rate: 15,
    stock: 48000,
    cover_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200",
    shop_name: "BelezaNatural BR",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "580.00万",
    influencer_rate: "93%",
    trend_data: [150, 158, 165, 172, 178, 182, 190],
    sales_7d: "18.90万",
    sales_7d_raw: 189000,
    revenue_7d: "R$754.11万 ($150.80万)",
    total_sales: "490.00万",
    total_sales_raw: 4900000,
    total_revenue: "R$19551.00万 ($3910.20万)",
    associated_influencers: 6500,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-br-2",
    name: "Fone de Ouvido Bluetooth Sem Fio TWS i12 Bass HD",
    category: "手机与数码",
    original_price: 89.90,
    sale_price: 34.90,
    currency: "R$",
    country: "巴西",
    country_flag: "🇧🇷",
    rating: 4.7,
    commission_rate: 18,
    stock: 65000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechBrasil Direct",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "890.00万",
    influencer_rate: "95%",
    trend_data: [230, 242, 255, 268, 278, 285, 296],
    sales_7d: "29.40万",
    sales_7d_raw: 294000,
    revenue_7d: "R$1026.06万 ($205.20万)",
    total_sales: "720.00万",
    total_sales_raw: 7200000,
    total_revenue: "R$25128.00万 ($5025.60万)",
    associated_influencers: 9200,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-br-3",
    name: "Calça Legging Cós Alto Suplex Fitness Feminina Academia",
    category: "女装与女士内衣",
    original_price: 69.90,
    sale_price: 29.90,
    currency: "R$",
    country: "巴西",
    country_flag: "🇧🇷",
    rating: 4.6,
    commission_rate: 16,
    stock: 52000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "ModaFitness BR",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "640.00万",
    influencer_rate: "91%",
    trend_data: [175, 184, 192, 201, 209, 215, 223],
    sales_7d: "22.10万",
    sales_7d_raw: 221000,
    revenue_7d: "R$660.79万 ($132.10万)",
    total_sales: "540.00万",
    total_sales_raw: 5400000,
    total_revenue: "R$16146.00万 ($3229.20万)",
    associated_influencers: 7100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-br-4",
    name: "Mochila Impermeável Masculina com Entrada USB Laptop",
    category: "时尚配件",
    original_price: 149.90,
    sale_price: 69.90,
    currency: "R$",
    country: "巴西",
    country_flag: "🇧🇷",
    rating: 4.8,
    commission_rate: 12,
    stock: 28000,
    cover_image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200",
    shop_name: "BagsBrasil",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "310.00万",
    influencer_rate: "88%",
    trend_data: [90, 94, 98, 103, 107, 110, 115],
    sales_7d: "11.30万",
    sales_7d_raw: 113000,
    revenue_7d: "R$789.87万 ($157.90万)",
    total_sales: "240.00万",
    total_sales_raw: 2400000,
    total_revenue: "R$16776.00万 ($3355.20万)",
    associated_influencers: 3800,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-br-5",
    name: "Mini Liquidificador Portátil Recarregável USB 380ml 6 Lâminas",
    category: "厨房用品",
    original_price: 99.90,
    sale_price: 44.90,
    currency: "R$",
    country: "巴西",
    country_flag: "🇧🇷",
    rating: 4.7,
    commission_rate: 14,
    stock: 39000,
    cover_image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200",
    shop_name: "CasaPrática BR",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "420.00万",
    influencer_rate: "90%",
    trend_data: [125, 131, 137, 143, 149, 153, 159],
    sales_7d: "15.70万",
    sales_7d_raw: 157000,
    revenue_7d: "R$704.93万 ($140.90万)",
    total_sales: "340.00万",
    total_sales_raw: 3400000,
    total_revenue: "R$15266.00万 ($3053.20万)",
    associated_influencers: 4900,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 日本 🇯🇵 (5 items)
  {
    id: "sp-jp-1",
    name: "【VT COSMETICS】CICA デイリースージングマスク (30枚入) 大容量",
    category: "美妆个护",
    original_price: 2420,
    sale_price: 1815,
    currency: "¥",
    country: "日本",
    country_flag: "🇯🇵",
    rating: 4.9,
    commission_rate: 12,
    stock: 45000,
    cover_image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200",
    shop_name: "VT Cosmetics JP",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "620.00万",
    influencer_rate: "95%",
    trend_data: [115, 120, 126, 132, 138, 142, 150],
    sales_7d: "14.80万",
    sales_7d_raw: 148000,
    revenue_7d: "¥2.68億 ($178.60万)",
    total_sales: "480.00万",
    total_sales_raw: 4800000,
    total_revenue: "¥87.12億 ($5808.00万)",
    associated_influencers: 7200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-jp-2",
    name: "【CANMAKE】マシュマロフィニッシュパウダー SPF50 PA+++ プレストパウダー",
    category: "美妆个护",
    original_price: 1034,
    sale_price: 858,
    currency: "¥",
    country: "日本",
    country_flag: "🇯🇵",
    rating: 4.8,
    commission_rate: 10,
    stock: 68000,
    cover_image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200",
    shop_name: "CANMAKE Official",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "890.00万",
    influencer_rate: "93%",
    trend_data: [168, 175, 182, 190, 198, 205, 215],
    sales_7d: "21.30万",
    sales_7d_raw: 213000,
    revenue_7d: "¥1.82億 ($121.30万)",
    total_sales: "690.00万",
    total_sales_raw: 6900000,
    total_revenue: "¥59.20億 ($3946.70万)",
    associated_influencers: 8400,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-jp-3",
    name: "完全ワイヤレスイヤホン Bluetooth 5.3 高音質 ノイズキャンセリング 防水",
    category: "手机与数码",
    original_price: 4980,
    sale_price: 2480,
    currency: "¥",
    country: "日本",
    country_flag: "🇯🇵",
    rating: 4.7,
    commission_rate: 16,
    stock: 28000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TokyoTech Direct",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "340.00万",
    influencer_rate: "91%",
    trend_data: [75, 78, 82, 86, 90, 92, 98],
    sales_7d: "9.60万",
    sales_7d_raw: 96000,
    revenue_7d: "¥2.38億 ($158.70万)",
    total_sales: "210.00万",
    total_sales_raw: 2100000,
    total_revenue: "¥52.08億 ($3472.00万)",
    associated_influencers: 4500,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-jp-4",
    name: "レディース ハイウエスト ヨガパンツ 美脚 レギンス 吸汗速乾",
    category: "女装与女士内衣",
    original_price: 2980,
    sale_price: 1580,
    currency: "¥",
    country: "日本",
    country_flag: "🇯🇵",
    rating: 4.6,
    commission_rate: 15,
    stock: 35000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "JapanFit Wear",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "410.00万",
    influencer_rate: "89%",
    trend_data: [95, 100, 105, 110, 115, 118, 123],
    sales_7d: "12.10万",
    sales_7d_raw: 121000,
    revenue_7d: "¥1.91億 ($127.30万)",
    total_sales: "290.00万",
    total_sales_raw: 2900000,
    total_revenue: "¥45.82億 ($3054.70万)",
    associated_influencers: 5200,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  },
  {
    id: "sp-jp-5",
    name: "ステンレス 保温 ボトル 500ml 軽量 真空断熱 ワンタッチオープン",
    category: "厨房用品",
    original_price: 2200,
    sale_price: 1280,
    currency: "¥",
    country: "日本",
    country_flag: "🇯🇵",
    rating: 4.8,
    commission_rate: 10,
    stock: 24000,
    cover_image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200",
    shop_name: "LifeStyle JP",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "280.00万",
    influencer_rate: "87%",
    trend_data: [65, 68, 71, 74, 77, 80, 85],
    sales_7d: "8.40万",
    sales_7d_raw: 84000,
    revenue_7d: "¥1.07億 ($71.30万)",
    total_sales: "185.00万",
    total_sales_raw: 1850000,
    total_revenue: "¥23.68億 ($1578.70万)",
    associated_influencers: 3400,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },

  // 新加坡 🇸🇬 (5 items)
  {
    id: "sp-sg-1",
    name: "Torriden DIVE-IN Low Molecular Hyaluronic Acid Serum 50ml",
    category: "美妆个护",
    original_price: 28.00,
    sale_price: 19.90,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.9,
    commission_rate: 15,
    stock: 14000,
    cover_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200",
    shop_name: "Torriden SG Store",
    shop_logo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=50",
    shop_sales: "95.00万",
    influencer_rate: "94%",
    trend_data: [30, 32, 33, 34, 35, 36, 39],
    sales_7d: "3.80万",
    sales_7d_raw: 38000,
    revenue_7d: "S$75.62万 ($56.00万)",
    total_sales: "82.00万",
    total_sales_raw: 820000,
    total_revenue: "S$1631.80万 ($1208.70万)",
    associated_influencers: 1850,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-sg-2",
    name: "Wireless Earbuds TWS Noise Cancelling Headphones Bluetooth 5.3",
    category: "手机与数码",
    original_price: 45.00,
    sale_price: 22.90,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.8,
    commission_rate: 18,
    stock: 18000,
    cover_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
    shop_name: "TechHub Singapore",
    shop_logo: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=50",
    shop_sales: "140.00万",
    influencer_rate: "92%",
    trend_data: [42, 44, 46, 48, 50, 51, 55],
    sales_7d: "5.40万",
    sales_7d_raw: 54000,
    revenue_7d: "S$123.66万 ($91.60万)",
    total_sales: "115.00万",
    total_sales_raw: 1150000,
    total_revenue: "S$2633.50万 ($1950.70万)",
    associated_influencers: 2600,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-sg-3",
    name: "High Waisted Seamless Leggings Tummy Control Women Activewear",
    category: "女装与女士内衣",
    original_price: 32.00,
    sale_price: 16.80,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.7,
    commission_rate: 16,
    stock: 16000,
    cover_image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200",
    shop_name: "ActiveFit SG",
    shop_logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
    shop_sales: "165.00万",
    influencer_rate: "90%",
    trend_data: [48, 50, 52, 55, 57, 59, 63],
    sales_7d: "6.20万",
    sales_7d_raw: 62000,
    revenue_7d: "S$104.16万 ($77.10万)",
    total_sales: "135.00万",
    total_sales_raw: 1350000,
    total_revenue: "S$2268.00万 ($1680.00万)",
    associated_influencers: 3100,
    shop_type: "crossborder",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-sg-4",
    name: "Stainless Steel Tumbler with Straw & Handle 900ml Vacuum",
    category: "厨房用品",
    original_price: 29.90,
    sale_price: 17.50,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.8,
    commission_rate: 12,
    stock: 12500,
    cover_image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200",
    shop_name: "EcoHome SG",
    shop_logo: "https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50",
    shop_sales: "110.00万",
    influencer_rate: "88%",
    trend_data: [38, 40, 42, 44, 46, 47, 50],
    sales_7d: "4.90万",
    sales_7d_raw: 49000,
    revenue_7d: "S$85.75万 ($63.50万)",
    total_sales: "92.00万",
    total_sales_raw: 920000,
    total_revenue: "S$1610.00万 ($1192.60万)",
    associated_influencers: 2200,
    shop_type: "local",
    product_type: "hot",
    status: "active"
  },
  {
    id: "sp-sg-5",
    name: "Foldable Desk Fan Rechargeable Quiet Operation USB 2000mAh",
    category: "居家日用",
    original_price: 25.00,
    sale_price: 13.90,
    currency: "S$",
    country: "新加坡",
    country_flag: "🇸🇬",
    rating: 4.7,
    commission_rate: 10,
    stock: 19000,
    cover_image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=200",
    shop_name: "BreezeSG",
    shop_logo: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=50",
    shop_sales: "175.00万",
    influencer_rate: "89%",
    trend_data: [55, 58, 60, 63, 66, 68, 72],
    sales_7d: "7.10万",
    sales_7d_raw: 71000,
    revenue_7d: "S$98.69万 ($73.10万)",
    total_sales: "145.00万",
    total_sales_raw: 1450000,
    total_revenue: "S$2015.50万 ($1493.00万)",
    associated_influencers: 3400,
    shop_type: "crossborder",
    product_type: "free_shipping",
    status: "active"
  }
];

// ── 过滤器配置 ─────────────────────────────────────────────────────────────
const REGIONS = [
  { value: 'all', label: '全部' },
  { value: '美国', label: '美国' },
  { value: '印度尼西亚', label: '印度尼西亚' },
  { value: '英国', label: '英国' },
  { value: '越南', label: '越南' },
  { value: '泰国', label: '泰国' },
  { value: '马来西亚', label: '马来西亚' },
  { value: '菲律宾', label: '菲律宾' },
  { value: '西班牙', label: '西班牙', isNew: true },
  { value: '墨西哥', label: '墨西哥', isNew: true },
  { value: '德国', label: '德国', isNew: true },
  { value: '法国', label: '法国', isNew: true },
  { value: '意大利', label: '意大利', isNew: true },
  { value: '巴西', label: '巴西', isNew: true },
  { value: '日本', label: '日本', isNew: true },
  { value: '新加坡', label: '新加坡', isNew: true }
];

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: '美妆个护', label: '美妆个护' },
  { value: '女装与女士内衣', label: '女装与女士内衣' },
  { value: '保健', label: '保健' },
  { value: '时尚配件', label: '时尚配件' },
  { value: '运动与户外', label: '运动与户外' },
  { value: '手机与数码', label: '手机与数码' },
  { value: '居家日用', label: '居家日用' },
  { value: '食品饮料', label: '食品饮料' },
  { value: '汽车与摩托车', label: '汽车与摩托车' },
  { value: '男装与男士内衣', label: '男装与男士内衣' },
  { value: '收藏品', label: '收藏品' },
  { value: '玩具和爱好', label: '玩具和爱好' },
  { value: '厨房用品', label: '厨房用品' }
];

const SHOP_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'crossborder', label: '跨境店' },
  { value: 'local', label: '本土店' }
];

const PRODUCT_STATUSES = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '在售' },
  { value: 'inactive', label: '下架' }
];

const TRANSLATIONS: Record<string, string> = {
  "sp-1": "【热卖】SOCKS HOUSE 男士纯棉运动短袜 (10双超值装)",
  "sp-3": "【护肤】Anua 77%鱼腥草舒缓控油爽肤水 250ml",
  "sp-4": "【清洁】泊泉雅 水杨酸祛痘修护净颜面膜 120g",
  "sp-5": "【速食】Indomie 营多牌经典印尼捞面 80g x 5包",
  "sp-6": "【精华】卡尼尔 30倍维他命C强效美白提亮精华液 30ml",
  "sp-7": "【清洁】高露洁 Max Fresh 冰爽劲白薄荷啫喱牙膏 150g",
  "sp-8": "【洁面】COSRX 晨间温和弱酸性洁面凝胶 150ml"
};

export default function ProductSelectionPage() {
  const [showDataEngineModal, setShowDataEngineModal] = useState(false);
  const [syncingEngine, setSyncingEngine] = useState(false);
  const [dataPlatforms, setDataPlatforms] = useState([
    { id: 'fastdata', name: 'FastData', desc: 'TikTok 全球电商数据大盘', status: 'active', latency: '12ms', lastSync: '10秒前', endpoint: 'https://api.fastdata.top/v1', apiKey: 'fd_live_sk_8f9a2b' },
    { id: 'echotik', name: 'EchoTik', desc: 'TikTok 爆款视频与达人带货数据', status: 'inactive', latency: '--', lastSync: '未连接', endpoint: '', apiKey: '' },
    { id: 'goodsfox', name: 'GoodsFox', desc: '跨境广告及全球选品情报引擎', status: 'inactive', latency: '--', lastSync: '未连接', endpoint: '', apiKey: '' },
    { id: 'kalodata', name: 'Kalodata', desc: 'TikTok Shop 销量与类目大盘分析', status: 'inactive', latency: '--', lastSync: '未连接', endpoint: '', apiKey: '' },
    { id: 'tikmeta', name: 'TikMeta', desc: 'TikTok 达人带货及短视频出单监测', status: 'inactive', latency: '--', lastSync: '未连接', endpoint: '', apiKey: '' },
    { id: 'shoplus', name: 'Shoplus', desc: 'TikTok 小店直播与商品实时监控', status: 'inactive', latency: '--', lastSync: '未连接', endpoint: '', apiKey: '' },
  ]);

  const [configuringPlatform, setConfiguringPlatform] = useState<any | null>(null);
  const [configEndpoint, setConfigEndpoint] = useState('');
  const [configApiKey, setConfigApiKey] = useState('');
  const [configInterval, setConfigInterval] = useState('5m');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isTranslated, setIsTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [isSearchingByImage, setIsSearchingByImage] = useState(false);
  const [imageSearchProgress, setImageSearchProgress] = useState(0);
  const [imageSearchPreview, setImageSearchPreview] = useState<string | null>(null);
  const [hasActiveImageSearch, setHasActiveImageSearch] = useState(false);
  const imageSearchInputRef = useRef<HTMLInputElement>(null);

  const handleTranslateToggle = () => {
    if (isTranslated) {
      setIsTranslated(false);
      toast.success('已恢复原始英文标题');
      return;
    }
    setTranslating(true);
    const toastId = toast.loading('AI 正在智能翻译商品标题及核心详情...');
    setTimeout(() => {
      setTranslating(false);
      setIsTranslated(true);
      toast.success('翻译完成！已成功切换至中文本地化展示', { id: toastId });
    }, 1000);
  };

  const handleTriggerImageSearch = () => {
    imageSearchInputRef.current?.click();
  };

  const handleImageSearchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSearchPreview(reader.result as string);
        setIsSearchingByImage(true);
        setImageSearchProgress(0);
        
        let progress = 0;
        const interval = setInterval(() => {
          progress += 8;
          if (progress >= 100) {
            clearInterval(interval);
            setImageSearchProgress(100);
            setTimeout(() => {
              setIsSearchingByImage(false);
              setHasActiveImageSearch(true);
              toast.success('🎉 图搜匹配成功！已为您筛选出同款相似的美妆商品。');
            }, 400);
          } else {
            setImageSearchProgress(progress);
          }
        }, 120);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImageSearch = () => {
    setHasActiveImageSearch(false);
    setImageSearchPreview(null);
    if (imageSearchInputRef.current) {
      imageSearchInputRef.current.value = '';
    }
    toast.info('已重置商品列表');
  };
  
  // ── 基础搜索 & 过滤状态 ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShopType, setSelectedShopType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active'); // 默认在售
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 展开分类状态
  const [showAllCategories, setShowAllCategories] = useState(false);

  // ── 指标下拉筛选状态 ──────────────────────────────────────────────────────
  const [minCommission, setMinCommission] = useState('all');
  const [minSales7d, setMinSales7d] = useState('all');
  const [minTotalSales, setMinTotalSales] = useState('all');

  // ── SKU库存对话框状态 ─────────────────────────────────────────────────────
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [selectedSkuProduct, setSelectedSkuProduct] = useState<SelectableProduct | null>(null);

  // ── 已导入 Supabase 商品 ID 记录 ──────────────────────────────────────────
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importingId, setImportingId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState(false);

  // ── 加载用户现有的商品 (用于去重与显示“已导入”) ───────────────────────────
  const fetchExistingProducts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const existingNames = new Set(data.map(p => p.name));
        const matchedIds = new Set<string>();
        for (const item of MOCK_SELECTION_POOL) {
          if (existingNames.has(item.name)) {
            matchedIds.add(item.id);
          }
        }
        setImportedIds(matchedIds);
      }
    } catch (err) {
      console.error('Error fetching user products:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchExistingProducts();
  }, [fetchExistingProducts]);

  // ── 切换商品类型勾选 ──────────────────────────────────────────────────────
  const toggleProductType = (type: string) => {
    setSelectedProductTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // ── 列表行多选与全选控制 ────────────────────────────────────────────────────
  const handleToggleRow = (id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── 执行单件商品导入到个人商品库 ────────────────────────────────────────────
  const handleImportProduct = async (item: SelectableProduct) => {
    const currentUserId = user?.id || 'demo-user-id';
    setImportingId(item.id);
    try {
      if (user?.id) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('name', item.name)
          .eq('user_id', user.id);

        if (existing && existing.length > 0) {
          toast.info('该商品已存在于您的商品管理中');
          setImportedIds(prev => new Set([...prev, item.id]));
          return;
        }
      }

      let targetCategory = '其他';
      if (item.category.includes('美妆') || item.category.includes('个护')) targetCategory = '美妆护肤';
      else if (item.category.includes('服装') || item.category.includes('内衣')) targetCategory = '服装配饰';
      else if (item.category.includes('数码') || item.category.includes('手机')) targetCategory = '数码电器';
      else if (item.category.includes('家居') || item.category.includes('日用')) targetCategory = '家居用品';
      else if (item.category.includes('食品') || item.category.includes('饮料')) targetCategory = '食品饮料';
      else if (item.category.includes('运动') || item.category.includes('户外')) targetCategory = '运动户外';
      else if (item.category.includes('母婴') || item.category.includes('玩具')) targetCategory = '母婴用品';

      const prodName = isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name;

      const payload = {
        user_id: currentUserId,
        name: prodName,
        category: targetCategory,
        sub_category: item.category,
        description: `【智能选品导入】来自${item.country}店铺 ${item.shop_name} 的爆款商品。7天销量达 ${item.sales_7d}。`,
        selling_points: ['跨境高出单率爆品', `带货达人推荐（已关联${item.associated_influencers}人）`, `佣金比例：${item.commission_rate}%`],
        original_price: item.original_price,
        sale_price: item.sale_price,
        stock: item.stock,
        specs: [
          { name: '地区', value: item.country },
          { name: '佣金率', value: `${item.commission_rate}%` },
          { name: '店铺', value: item.shop_name }
        ],
        images: [item.cover_image],
        cover_image: item.cover_image,
        status: 'active',
        sales_count: item.total_sales_raw || 0
      };

      if (user?.id) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) {
          console.warn('Supabase insert warning:', error.message);
        }
      }

      toast.success(`🎉 导入成功！已将「${prodName.slice(0, 16)}...」添加到“商品管理”`);
      setImportedIds(prev => new Set([...prev, item.id]));
    } catch (err: any) {
      toast.error('导入出错：' + err.message);
    } finally {
      setImportingId(null);
    }
  };

  // ── 批量导入勾选商品 ────────────────────────────────────────────────────────
  const handleBatchImport = async (targetProducts: SelectableProduct[]) => {
    if (selectedRowIds.size === 0) return;
    setIsBatchImporting(true);
    const toastId = toast.loading(`正在批量导入 ${selectedRowIds.size} 件爆品...`);
    let successCount = 0;
    try {
      const itemsToImport = targetProducts.filter(p => selectedRowIds.has(p.id));
      const currentUserId = user?.id || 'demo-user-id';

      for (const item of itemsToImport) {
        if (importedIds.has(item.id)) continue;
        let targetCategory = '其他';
        if (item.category.includes('美妆') || item.category.includes('个护')) targetCategory = '美妆护肤';
        else if (item.category.includes('服装') || item.category.includes('内衣')) targetCategory = '服装配饰';
        else if (item.category.includes('数码') || item.category.includes('手机')) targetCategory = '数码电器';
        else if (item.category.includes('家居') || item.category.includes('日用')) targetCategory = '家居用品';
        else if (item.category.includes('食品') || item.category.includes('饮料')) targetCategory = '食品饮料';
        else if (item.category.includes('运动') || item.category.includes('户外')) targetCategory = '运动户外';
        else if (item.category.includes('母婴') || item.category.includes('玩具')) targetCategory = '母婴用品';

        const prodName = isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name;
        const payload = {
          user_id: currentUserId,
          name: prodName,
          category: targetCategory,
          sub_category: item.category,
          description: `【智能选品导入】来自${item.country}店铺 ${item.shop_name} 的爆款商品。7天销量达 ${item.sales_7d}。`,
          selling_points: ['跨境高出单率爆品', `带货达人推荐（已关联${item.associated_influencers}人）`, `佣金比例：${item.commission_rate}%`],
          original_price: item.original_price,
          sale_price: item.sale_price,
          stock: item.stock,
          specs: [
            { name: '地区', value: item.country },
            { name: '佣金率', value: `${item.commission_rate}%` },
            { name: '店铺', value: item.shop_name }
          ],
          images: [item.cover_image],
          cover_image: item.cover_image,
          status: 'active',
          sales_count: item.total_sales_raw || 0
        };

        if (user?.id) {
          await supabase.from('products').insert(payload);
        }
        successCount++;
      }

      setImportedIds(prev => {
        const next = new Set(prev);
        selectedRowIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedRowIds(new Set());
      toast.success(`🎉 批量导入完成！成功将 ${successCount} 件爆品同步至“商品管理”`, { id: toastId });
    } catch (err: any) {
      toast.error('批量导入异常：' + err.message, { id: toastId });
    } finally {
      setIsBatchImporting(false);
    }
  };

  // ── 计算过滤结果 ──────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return MOCK_SELECTION_POOL.filter(item => {
      // 图搜同款过滤 (只展示美妆个护分类商品作为匹配结果)
      if (hasActiveImageSearch && item.category !== '美妆个护') return false;

      // 搜索框过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const displayName = isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name;
        const matchName = displayName.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchShop = item.shop_name.toLowerCase().includes(query);
        if (!matchName && !matchCategory && !matchShop) return false;
      }

      // 国家/地区过滤
      if (selectedRegion !== 'all' && item.country !== selectedRegion) return false;

      // 分类过滤
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 店铺类型过滤
      if (selectedShopType !== 'all' && item.shop_type !== selectedShopType) return false;

      // 商品状态过滤
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

      // 商品类型过滤 (CheckBoxes)
      if (selectedProductTypes.length > 0) {
        const matchesType = selectedProductTypes.some(type => {
          if (type === 'new') return item.product_type === 'new';
          if (type === 'free_shipping') return item.product_type === 'free_shipping';
          if (type === 'local_warehouse') return item.product_type === 'local_warehouse';
          if (type === 'hot') return item.product_type === 'hot';
          return false;
        });
        if (!matchesType) return false;
      }

      // 佣金率过滤
      if (minCommission !== 'all') {
        const minComm = parseInt(minCommission);
        if (item.commission_rate < minComm) return false;
      }

      // 7天销量过滤
      if (minSales7d !== 'all') {
        const minS = parseInt(minSales7d);
        if (item.sales_7d_raw < minS) return false;
      }

      // 总销量过滤
      if (minTotalSales !== 'all') {
        const minT = parseInt(minTotalSales);
        if (item.total_sales_raw < minT) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    selectedRegion,
    selectedCategory,
    selectedShopType,
    selectedStatus,
    selectedProductTypes,
    minCommission,
    minSales7d,
    minTotalSales,
    isTranslated,
    hasActiveImageSearch
  ]);

  // ── CSV 数据导出 ──────────────────────────────────────────────────────────
  const handleExportData = () => {
    if (filteredProducts.length === 0) {
      toast.error('暂无数据可导出');
      return;
    }
    const headers = ['商品名称', '分类', '售价', '国家/地区', '佣金比例', '所属店铺', '店铺销量', '近7天销量', '总销量', '关联达人'];
    const rows = filteredProducts.map(item => [
      item.name,
      item.category,
      `${item.currency}${item.sale_price}`,
      item.country,
      `${item.commission_rate}%`,
      item.shop_name,
      item.shop_sales,
      item.sales_7d,
      item.total_sales,
      item.associated_influencers
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `智能选品数据_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`成功导出 ${filteredProducts.length} 条选品数据`);
  };

  // ── 渲染 Sparkline 趋势折线图 ───────────────────────────────────────────────
  const renderSparkline = (data: number[]) => {
    if (!data || data.length === 0) return null;
    const width = 110;
    const height = 36;
    const padding = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const fillD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#trend-grad)" />
        <path d={pathD} fill="none" stroke="#ec4899" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── 头部标题 ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-balance text-rose-600 dark:text-rose-400">
              <Sparkles className="w-6 h-6 animate-pulse" /> 全球选品
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDataEngineModal(true)}
              className="h-8 text-xs font-semibold gap-1.5 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full px-3 shadow-sm transition-all"
            >
              <Database className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              数据引擎
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block ml-0.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            汇聚全球电商爆款，大数据实时追踪，一键导入商品并创作AIGC带货视频
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/30 dark:text-rose-400" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-1.5" /> 数据导出
          </Button>
        </div>
      </div>

      {/* ── 搜索栏 ────────────────────────────────────────────────────────── */}
      <div className="bg-card/75 border border-rose-100 dark:border-rose-950/20 backdrop-blur-md rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="商品搜索（输入商品名、分类或店铺进行检索）"
              className="pl-9 pr-3 h-11 border-rose-100 dark:border-rose-950/30 focus-visible:ring-rose-500 rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <input
              type="file"
              ref={imageSearchInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSearchUpload}
            />
            <Button
              variant={isTranslated ? "default" : "outline"}
              onClick={handleTranslateToggle}
              disabled={translating}
              className={cn(
                "h-11 px-4 gap-2 border-rose-100 dark:border-rose-950/30 text-xs font-medium rounded-xl transition-all",
                isTranslated
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  : "hover:bg-rose-50 hover:text-rose-600"
              )}
            >
              {translating ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <Languages className="w-4 h-4 text-rose-500" />
              )}
              <span>{isTranslated ? '显示英文' : '翻译中文'}</span>
            </Button>
            <Button
              onClick={handleTriggerImageSearch}
              className="h-11 px-5 gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white border-0 font-medium rounded-xl shadow-md shadow-rose-500/25 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>图搜同款</span>
            </Button>
          </div>
        </div>

        {/* ── 过滤器面板 ────────────────────────────────────────────────────── */}
        <div className="space-y-3.5 pt-2 text-sm border-t border-rose-100/50 dark:border-rose-950/10">
          {/* 国家/地区 */}
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 py-1.5 font-medium">国家/地区:</span>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {REGIONS.map(reg => (
                <button
                  key={reg.value}
                  onClick={() => setSelectedRegion(reg.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    selectedRegion === reg.value
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  )}
                >
                  {reg.label}
                  {reg.isNew && (
                    <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 rounded-sm scale-90 leading-none py-0.5">NEW</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 商品分类 */}
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 py-1.5 font-medium">商品分类:</span>
            <div className="flex-1 flex flex-wrap gap-1.5 items-center">
              {(showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 8)).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    selectedCategory === cat.value
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                  )}
                >
                  {cat.label}
                </button>
              ))}
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs text-rose-500 font-semibold hover:underline flex items-center ml-2 py-1"
              >
                {showAllCategories ? '收起 ^' : '展开 v'}
              </button>
            </div>
          </div>

          {/* 店铺类型 & 商品状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">店铺类型:</span>
              <div className="flex gap-1.5">
                {SHOP_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => setSelectedShopType(st.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      selectedShopType === st.value
                        ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">商品状态:</span>
              <div className="flex gap-1.5">
                {PRODUCT_STATUSES.map(ps => (
                  <button
                    key={ps.value}
                    onClick={() => setSelectedStatus(ps.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      selectedStatus === ps.value
                        ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                    )}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 商品类型 Checkboxes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium font-medium">商品类型:</span>
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { id: 'new', label: '上新商品' },
                { id: 'free_shipping', label: '包邮商品' },
                { id: 'local_warehouse', label: '本地仓商品' },
                { id: 'hot', label: '爆款商品' }
              ].map(type => (
                <label key={type.id} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-rose-600">
                  <input
                    type="checkbox"
                    checked={selectedProductTypes.includes(type.id)}
                    onChange={() => toggleProductType(type.id)}
                    className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 h-4 w-4"
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 上架时间 & 多重过滤下拉框 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* 上架时间 */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 font-medium">上架时间:</span>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-rose-100 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 bg-background"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-muted-foreground text-xs">→</span>
                <input
                  type="date"
                  className="px-2 py-1 text-xs border border-rose-100 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 bg-background"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            {/* 多重过滤下拉框 */}
            <div className="flex flex-wrap gap-2 flex-1 md:justify-end">
              <Select value={minCommission} onValueChange={setMinCommission}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="佣金比例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">佣金比例: 全部</SelectItem>
                  <SelectItem value="5">5% 及以上</SelectItem>
                  <SelectItem value="10">10% 及以上</SelectItem>
                  <SelectItem value="15">15% 及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minSales7d} onValueChange={setMinSales7d}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="近7天销量" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">近7天销量: 全部</SelectItem>
                  <SelectItem value="10000">1万及以上</SelectItem>
                  <SelectItem value="50000">5万及以上</SelectItem>
                  <SelectItem value="100000">10万及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minTotalSales} onValueChange={setMinTotalSales}>
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="总销量" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">总销量: 全部</SelectItem>
                  <SelectItem value="100000">10万及以上</SelectItem>
                  <SelectItem value="1000000">100万及以上</SelectItem>
                  <SelectItem value="3000000">300万及以上</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-8 text-xs border-rose-100 bg-background">
                  <SelectValue placeholder="带货达人人数" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">带货达人: 全部</SelectItem>
                  <SelectItem value="100">100人以上</SelectItem>
                  <SelectItem value="1000">1000人以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {hasActiveImageSearch && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/15 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
            {imageSearchPreview && (
              <img src={imageSearchPreview} className="w-8 h-8 object-cover rounded-md border border-rose-200" alt="Search source" />
            )}
            <div>
              <span className="font-semibold">已启用图搜同款过滤</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">正在为您展示与上传图片视觉特征最相似的商品货源</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearImageSearch}
            className="h-8 px-2.5 text-rose-600 hover:bg-rose-100/50 hover:text-rose-700 font-semibold"
          >
            <X className="w-3.5 h-3.5 mr-1" /> 重置筛选
          </Button>
        </div>
      )}

      {/* ── 批量导入操作栏 ──────────────────────────────────────────────── */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-sm text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-rose-700 dark:text-rose-300">
              已选 <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedRowIds.size}</strong> 件爆款商品
            </span>
            <span className="text-muted-foreground text-[11px]">（可一键将选中的商品批量入库至商品管理）</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isBatchImporting}
              onClick={() => handleBatchImport(filteredProducts)}
              className="h-8 px-3 text-xs bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium shadow-sm"
            >
              {isBatchImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              批量导入到商品管理
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRowIds(new Set())}
              className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-100/50"
            >
              清空勾选
            </Button>
          </div>
        </div>
      )}

      {/* ── 商品列表表格 ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-rose-100 dark:border-rose-950/20 rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-rose-50/50 dark:bg-rose-950/10">
            <TableRow className="border-rose-100/50 dark:border-rose-950/10">
              <TableHead className="w-10 text-center py-4">
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && selectedRowIds.size === filteredProducts.length}
                  onChange={() => {
                    if (selectedRowIds.size === filteredProducts.length) {
                      setSelectedRowIds(new Set());
                    } else {
                      setSelectedRowIds(new Set(filteredProducts.map(p => p.id)));
                    }
                  }}
                  className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                  title="全选 / 反选"
                />
              </TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[280px]">商品</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[160px]">所属店铺</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[100px] text-center">达人出单率</TableHead>
              <TableHead className="text-xs font-semibold py-4 w-[130px] text-center">近7天销量趋势</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center text-rose-500">近7天销量</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">近7天销售额</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">总销量</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">总销售额</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center">关联达人</TableHead>
              <TableHead className="text-xs font-semibold py-4 text-center w-[130px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                  没有找到符合过滤条件的爆款选品，请尝试调整搜索词或筛选条件。
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(item => {
                const isImported = importedIds.has(item.id);
                return (
                  <TableRow key={item.id} className="border-rose-100/40 hover:bg-rose-50/10 dark:border-rose-950/5 transition-colors">
                    {/* 多选列 */}
                    <TableCell className="text-center py-4">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(item.id)}
                        onChange={() => handleToggleRow(item.id)}
                        className="rounded border-rose-300 text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                      />
                    </TableCell>

                    {/* 商品主体列 */}
                    <TableCell className="py-4">
                      <div className="flex gap-3">
                        <img
                          src={item.cover_image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-xl border border-rose-100/50 dark:border-rose-950/10 shrink-0 bg-muted"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=200';
                          }}
                        />
                        <div className="flex flex-col justify-between min-w-0">
                          <p className="text-xs font-semibold leading-tight text-foreground line-clamp-2 hover:text-rose-500 transition-colors" title={isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name}>
                            {isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-rose-500">
                              售价: {item.currency}{item.sale_price}
                            </span>
                            <span className="text-[10px] text-muted-foreground line-through">
                              {item.currency}{item.original_price}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-950/20 border-0 flex items-center gap-0.5">
                              <span>{item.country_flag}</span>
                              <span>{item.country}</span>
                            </Badge>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 border-0 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500 shrink-0" />
                              <span>{item.rating}</span>
                            </Badge>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-0">
                              佣金: {item.commission_rate}%
                            </Badge>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSkuProduct(item);
                              setSkuModalOpen(true);
                            }}
                            className="text-[10px] text-rose-500 font-semibold hover:underline mt-1 text-left w-fit flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" /> SKU库存
                          </button>
                        </div>
                      </div>
                    </TableCell>

                    {/* 所属店铺 */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.shop_logo}
                          alt={item.shop_name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-muted bg-muted"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590156221122-c7b3cd6d21a0?w=50';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate" title={item.shop_name}>
                            {item.shop_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            店铺销量: {item.shop_sales}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 达人出单率 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.influencer_rate}
                    </TableCell>

                    {/* 近7天销量趋势 */}
                    <TableCell className="py-4 text-center">
                      <div className="inline-block">
                        {renderSparkline(item.trend_data)}
                      </div>
                    </TableCell>

                    {/* 近7天销量 */}
                    <TableCell className="py-4 text-center text-sm font-bold text-rose-500 dark:text-rose-400">
                      {item.sales_7d}
                    </TableCell>

                    {/* 近7天销售额 */}
                    <TableCell className="py-4 text-center text-xs text-muted-foreground">
                      {item.revenue_7d}
                    </TableCell>

                    {/* 总销量 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.total_sales}
                    </TableCell>

                    {/* 总销售额 */}
                    <TableCell className="py-4 text-center text-xs text-muted-foreground">
                      {item.total_revenue}
                    </TableCell>

                    {/* 关联达人 */}
                    <TableCell className="py-4 text-center text-xs font-medium text-foreground">
                      {item.associated_influencers}
                    </TableCell>

                    {/* 操作列 */}
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-col gap-1.5 items-center justify-center">
                        {isImported ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-20 text-[11px] border-emerald-500 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 cursor-default"
                              disabled
                            >
                              <Check className="w-3.5 h-3.5 mr-0.5" /> 已导入
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 w-20 text-[11px] bg-rose-500 hover:bg-rose-600 text-white shadow-sm flex items-center justify-center gap-0.5"
                              onClick={() => {
                                let targetCategory = '其他';
                                if (item.category.includes('美妆') || item.category.includes('个护')) targetCategory = '美妆护肤';
                                else if (item.category.includes('服装') || item.category.includes('内衣')) targetCategory = '服装配饰';
                                else if (item.category.includes('数码') || item.category.includes('手机')) targetCategory = '数码电器';
                                else if (item.category.includes('家居') || item.category.includes('日用')) targetCategory = '家居用品';
                                else if (item.category.includes('食品') || item.category.includes('饮料')) targetCategory = '食品饮料';
                                else if (item.category.includes('运动') || item.category.includes('户外')) targetCategory = '运动户外';
                                else if (item.category.includes('母婴') || item.category.includes('玩具')) targetCategory = '母婴用品';

                                const displayName = isTranslated ? (TRANSLATIONS[item.id] || item.name) : item.name;
                                navigate('/video/create', {
                                  state: {
                                    inputTab: '商品',
                                    prefillProductName: displayName,
                                    selectedProduct: {
                                      id: item.id,
                                      user_id: user?.id || 'demo',
                                      name: displayName,
                                      category: targetCategory,
                                      sub_category: item.category,
                                      description: `【智能选品爆款】来自${item.country} ${item.shop_name}。7天热销 ${item.sales_7d}，佣金率 ${item.commission_rate}%。`,
                                      selling_points: ['跨境高出单率爆品', `达人推荐·已关联${item.associated_influencers}人`, `高额佣金：${item.commission_rate}%`],
                                      ai_selling_points: [`佣金率${item.commission_rate}%`, `${item.country}爆款货源`],
                                      original_price: item.original_price,
                                      sale_price: item.sale_price,
                                      stock: item.stock,
                                      specs: [
                                        { name: '地区', value: item.country },
                                        { name: '佣金率', value: `${item.commission_rate}%` },
                                        { name: '店铺', value: item.shop_name }
                                      ],
                                      images: [item.cover_image],
                                      cover_image: item.cover_image,
                                      status: 'active',
                                      sales_count: item.total_sales_raw || 0,
                                      target_language: 'zh',
                                      target_platform: 'douyin',
                                      created_at: new Date().toISOString(),
                                      updated_at: new Date().toISOString()
                                    }
                                  }
                                });
                              }}
                            >
                              <Video className="w-3 h-3" /> 去带货
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={importingId === item.id}
                            className="h-8 w-20 text-[11px] bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white border-0 font-medium rounded-md shadow-sm"
                            onClick={() => handleImportProduct(item)}
                          >
                            {importingId === item.id ? '导入中...' : '一键导入'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── SKU库存详情弹窗 ───────────────────────────────────────────────── */}
      <Dialog open={skuModalOpen} onOpenChange={setSkuModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Info className="w-5 h-5 text-rose-500" /> SKU库存详情
            </DialogTitle>
          </DialogHeader>
          {selectedSkuProduct && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3 pb-3 border-b border-rose-100/50 dark:border-rose-950/15">
                <img
                  src={selectedSkuProduct.cover_image}
                  className="w-12 h-12 object-cover rounded-lg bg-muted"
                  alt=""
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold line-clamp-1">{selectedSkuProduct.name}</p>
                  <p className="text-[11px] text-rose-500 font-bold mt-1">
                    在售售价: {selectedSkuProduct.currency}{selectedSkuProduct.sale_price}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">规格明细</p>
                <div className="divide-y divide-rose-100/30 border border-rose-100/30 rounded-xl overflow-hidden text-xs">
                  <div className="flex justify-between p-2.5 bg-muted/40 font-medium text-muted-foreground">
                    <span>规格名称</span>
                    <span>库存数量</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>标准版 / 经典配色</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.4)} 件</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>升级版 / 极客灰</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.35)} 件</span>
                  </div>
                  <div className="flex justify-between p-2.5 hover:bg-muted/10">
                    <span>至尊版 / 幻影黑</span>
                    <span className="font-semibold">{Math.round(selectedSkuProduct.stock * 0.25)} 件</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-100/30">
                <span className="text-xs text-muted-foreground">总库存数量:</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {selectedSkuProduct.stock.toLocaleString()} 件
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full h-9 text-xs rounded-xl" onClick={() => setSkuModalOpen(false)}>
              关闭窗口
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 图搜扫描动画弹窗 ──────────────────────────────────────────────── */}
      <Dialog open={isSearchingByImage} onOpenChange={setIsSearchingByImage}>
        <DialogContent className="max-w-xs rounded-2xl bg-zinc-950 border border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-sm font-bold text-zinc-200 flex items-center justify-center gap-1.5">
              <Camera className="w-4 h-4 text-rose-500 animate-pulse" /> 智能以图搜款
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 relative w-32 h-32 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
            {imageSearchPreview ? (
              <img src={imageSearchPreview} className="w-full h-full object-cover" alt="Searching" />
            ) : (
              <Camera className="w-8 h-8 text-zinc-600" />
            )}
            
            {/* 扫描线动画 */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent top-0 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: 'scan 2s ease-in-out infinite' }} />
            <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
          </div>

          <div className="mt-4 w-full space-y-1">
            <p className="text-xs text-zinc-400 font-medium">AI 正在提取视觉特征并在全球供应链检索...</p>
            <div className="flex justify-between text-[10px] text-zinc-500 px-1 pt-1.5">
              <span>检索中...</span>
              <span>{imageSearchProgress}%</span>
            </div>
            {/* 进度条 */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-150"
                style={{ width: `${imageSearchProgress}%` }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
      {/* ── 数据引擎第三方接入弹窗 ───────────────────────────────────────────── */}
      <Dialog open={showDataEngineModal} onOpenChange={setShowDataEngineModal}>
        <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-400">
              <Database className="w-5 h-5 text-rose-500" />
              第三方数据引擎接入中心
            </DialogTitle>
            <p className="text-xs text-zinc-400">
              集成 FastData、EchoTik、GoodsFox 等 6 大跨境数据引擎。仅第一个节点默认连接，其它点击配置 API Key 即可接入
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-zinc-200">数据源接入状态</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {dataPlatforms.filter(p => p.status === 'active').length}/6 节点已连接
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={syncingEngine}
                onClick={() => {
                  setSyncingEngine(true);
                  const toastId = toast.loading('正在同步全网电商大盘数据...');
                  setTimeout(() => {
                    setSyncingEngine(false);
                    toast.success('🎉 已接入节点的电商数据同步完成！', { id: toastId });
                  }, 1200);
                }}
                className="h-7 text-xs gap-1.5 border-rose-500/40 text-rose-400 hover:bg-rose-950/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingEngine ? 'animate-spin' : ''}`} />
                {syncingEngine ? '同步中...' : '增量同步数据'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {dataPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100">{platform.name}</span>
                        {platform.status === 'active' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                            {platform.latency}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                            未配置
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{platform.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setConfiguringPlatform(platform);
                        setConfigEndpoint(platform.endpoint || `https://api.${platform.id.toLowerCase()}.com/v1`);
                        setConfigApiKey(platform.apiKey || '');
                      }}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                        platform.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                      }`}
                    >
                      {platform.status === 'active' ? '● 已连接 (配置)' : '⚙️ 配置 API'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                    <span className="flex items-center gap-1">
                      {platform.status === 'active' ? (
                        <><ShieldCheck className="w-3 h-3 text-emerald-400" /> API 已授权</>
                      ) : (
                        <><Info className="w-3 h-3 text-zinc-500" /> 需配置 API Key</>
                      )}
                    </span>
                    <span>状态: {platform.lastSync}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800/80 pt-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowDataEngineModal(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-6 rounded-xl"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 平台 API Key 配置小弹窗 ─────────────────────────────────────────── */}
      <Dialog open={!!configuringPlatform} onOpenChange={(open) => { if (!open) setConfiguringPlatform(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-5 rounded-2xl shadow-2xl z-50">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
              <Zap className="w-4 h-4 text-rose-500" />
              配置 {configuringPlatform?.name} 数据接口 API
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">API Base Endpoint (接口地址)</label>
              <Input
                value={configEndpoint}
                onChange={(e) => setConfigEndpoint(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">API Key (密钥授权码)</label>
              <Input
                type="password"
                value={configApiKey}
                onChange={(e) => setConfigApiKey(e.target.value)}
                placeholder="请输入您在第三方平台的 API Secret Key"
                className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">数据同步频率</label>
              <Select value={configInterval} onValueChange={setConfigInterval}>
                <SelectTrigger className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="1m">1 分钟 (实时最高优先级)</SelectItem>
                  <SelectItem value="5m">5 分钟 (推荐标准频率)</SelectItem>
                  <SelectItem value="15m">15 分钟 (低频防限流)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfiguringPlatform(null)}
              className="h-8 text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-900"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!configApiKey.trim()) {
                  toast.error('请先输入 API Key 授权码');
                  return;
                }
                setDataPlatforms(prev => prev.map(p =>
                  p.id === configuringPlatform.id
                    ? { ...p, status: 'active', latency: '15ms', lastSync: '刚才', endpoint: configEndpoint, apiKey: configApiKey }
                    : p
                ));
                toast.success(`🎉 ${configuringPlatform.name} API 接口配置成功并上线连接！`);
                setConfiguringPlatform(null);
              }}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              保存并开启连接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
