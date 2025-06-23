import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../components/ui/Modal';
import { ShoppingCart, Settings, Save, Trash, X } from 'lucide-react';

const ComponentDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState('md');

  const openModal = (size) => {
    setModalSize(size);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-8">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Button Component</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="success">Success Button</Button>
          <Button variant="warning">Warning Button</Button>
          <Button variant="info">Info Button</Button>
        </div>

        <h3 className="text-xl font-semibold mt-4">Button Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>

        <h3 className="text-xl font-semibold mt-4">Button States</h3>
        <div className="flex flex-wrap gap-4">
          <Button disabled>Disabled Button</Button>
          <Button loading>Loading Button</Button>
          <Button fullWidth>Full Width Button</Button>
        </div>

        <h3 className="text-xl font-semibold mt-4">Buttons with Icons</h3>
        <div className="flex flex-wrap gap-4">
          <Button icon={ShoppingCart}>Add to Cart</Button>
          <Button icon={Settings} variant="secondary">Settings</Button>
          <Button icon={Save} variant="success" iconPosition="right">Save</Button>
          <Button icon={Trash} variant="danger">Delete</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Modal Component</h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => openModal('sm')}>Open Small Modal</Button>
          <Button onClick={() => openModal('md')}>Open Medium Modal</Button>
          <Button onClick={() => openModal('lg')}>Open Large Modal</Button>
          <Button onClick={() => openModal('xl')}>Open Extra Large Modal</Button>
        </div>

        <Modal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          title="Modal Example" 
          size={modalSize}
        >
          <ModalContent>
            <p className="mb-4">This is an example modal with proper animations and transitions as defined in the design system.</p>
            <p>The modal follows the design system structure with modal-backdrop, modal-container, modal-header, etc.</p>
          </ModalContent>
          <ModalFooter>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={closeModal}>Confirm</Button>
          </ModalFooter>
        </Modal>
      </section>
    </div>
  );
};

export default ComponentDemo;