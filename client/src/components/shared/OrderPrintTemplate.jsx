import logger from "../../utils/logger.js";
import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col,
} from 'react-bootstrap';
import Barcode from 'react-barcode';
import axios from 'axios';
import logo from '../../logo.svg';

const OrderPrintTemplate = ({ order, formatDate }) => {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: 'Pazar+',
    companyPhone: '0(555) 123 45 67',
    companyEmail: 'support@pazar-plus.com',
    companyWebsite: 'www.pazar-plus.com',
    companyAddress: '',
    companyLogo: null
  });
  const [currentDate] = useState(new Date());
  
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await axios.get('/settings/company');
        if (response.data && response.data.success) {
          setCompanyInfo(prevInfo => ({
            ...prevInfo,
            ...response.data.data
          }));
        }
      } catch (err) {
        logger.error('Error fetching company info:', err);
      }
    };
    
    fetchCompanyInfo();
  }, []);  // No need to include companyInfo since we're using functional update

  // Generate campaign code
  const generateCampaignCode = () => {
    // If the order has a specific field for campaign code, use that
    if (order.campaignCode) return order.campaignCode;
    
    // Otherwise, generate a 16-digit code based on the order ID
    const baseCode = (parseInt(order.id) * 127).toString();
    return baseCode.padStart(16, '0').substring(0, 16);
  };

  // Generate campaign code for display and barcode
  const campaignCode = generateCampaignCode();
  
  return (
    <div className="print-content pazar-format">
      {/* Header with logo */}
      <Row className="mb-4">
        <Col xs={12} className="text-center mb-3">
          {companyInfo.companyLogo ? 
            <img src={companyInfo.companyLogo} alt="Company Logo" style={{ height: '60px' }} /> :
            <img src={logo} alt="Company Logo" style={{ height: '60px' }} />
          }
        </Col>
      </Row>
      
      {/* Sender Information */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="pazar-section">
            <div className="pazar-section-title">Gönderici Bilgileri</div>
            <div className="pazar-section-content">
              <p><strong>Gönderici Şirket:</strong> {order.senderCompany || companyInfo.companyName}</p>
              <p><strong>Gönderici Şirket Tel:</strong> {order.senderPhone || companyInfo.companyPhone}</p>
              {companyInfo.companyAddress && (
                <p><strong>Gönderici Adres:</strong> {companyInfo.companyAddress}</p>
              )}
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Recipient Information */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="pazar-section">
            <div className="pazar-section-title">Alıcı Bilgileri</div>
            <div className="pazar-section-content">
              <p><strong>Alıcı Ad / Soyad:</strong> {order.customerName}</p>
              <p><strong>Alıcı Adres:</strong> {order.shippingAddress?.line1 || 'N/A'} {order.shippingAddress?.line2 || ''}</p>
              <p><strong>Şehir / Semt / PK:</strong> {order.shippingAddress?.city || 'N/A'} / {order.shippingAddress?.region || 'N/A'}</p>
              <p><strong>Ev / Cep Telefonu:</strong> {order.customerPhone || 'N/A'}</p>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Order Information */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="pazar-section">
            <div className="pazar-section-title">Sipariş Bilgileri</div>
            <div className="pazar-section-content">
              <p><strong>Sipariş Tarihi:</strong> {formatDate(order.orderDate || currentDate)}</p>
              <p><strong>Sipariş Numarası:</strong> {order.platformOrderId || order.id}</p>
              <p><strong>Ödeme Tipi:</strong> {order.paymentMethod || ''}</p>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Campaign Code with Barcode */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="pazar-section">
            <div className="pazar-section-title">Kampanya Kodu</div>
            <div className="pazar-section-content">
              <p className="campaign-code">{campaignCode}</p>
              <div className="text-center my-2">
                <Barcode 
                  value={campaignCode} 
                  width={1.5}
                  height={40}
                  fontSize={14}
                  margin={5}
                  displayValue={true}
                />
              </div>
              <p className="small text-danger">
                Kampanya kodunun hata vermesi durumunda çıkış yapmayınız, gönderici firma ile irtibata geçiniz.
              </p>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Ordered Products */}
      <Row className="mb-3">
        <Col xs={12}>
          <div className="pazar-section">
            <div className="pazar-section-title">Sipariş Edilen Ürünler</div>
            <div className="pazar-section-content">
              {order.orderItems?.map((item, index) => (
                <p key={index}>
                  {item.sku || 'SKU-'+(index+1)} / {item.productTitle} x {item.quantity} Adet
                </p>
              ))}
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Footer */}
      <Row className="mt-5">
        <Col className="text-center pt-3">
          <p className="mb-0 small">
            <strong>{companyInfo.companyName}</strong> | {companyInfo.companyEmail} | {companyInfo.companyWebsite}
          </p>
        </Col>
      </Row>
    </div>
  );
};

export default OrderPrintTemplate;