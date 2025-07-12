import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              © {currentYear} Diskominfo Kab. Bandung | Network Monitoring Monitoring System. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-500">
              Version 1.0.0
            </span>
            <span className="text-sm text-gray-500">
              Built with ❤️ by Gugah Nugraha
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
