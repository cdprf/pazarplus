const path = require("path");
const { DataTypes } = require("sequelize");

// Import database configuration
const sequelize = require("./config/database");

// Define User model
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

async function examineOriginalTemplates() {
  try {
    await sequelize.authenticate();
    console.log("📄 Database connected successfully");

    const users = await User.findAll({
      attributes: ["id", "email", "fullName", "settings"],
      where: {
        settings: {
          [sequelize.Sequelize.Op.ne]: null,
        },
      },
    });

    console.log(`👥 Found ${users.length} users with settings`);

    for (const user of users) {
      let userSettings;
      try {
        userSettings =
          typeof user.settings === "string"
            ? JSON.parse(user.settings || "{}")
            : user.settings || {};
      } catch (error) {
        console.log(
          `❌ Failed to parse settings for user ${user.id}: ${error.message}`
        );
        continue;
      }

      if (
        userSettings.shippingTemplates &&
        userSettings.shippingTemplates.length > 0
      ) {
        console.log(
          `\n👤 User ${user.id} (${user.email}) has ${userSettings.shippingTemplates.length} templates:`
        );

        for (const template of userSettings.shippingTemplates) {
          console.log(`\n📋 Template: ${template.config?.name || "Unnamed"}`);
          console.log(
            `📏 Paper: ${template.config?.paperSize || "Unknown"} ${
              template.config?.paperOrientation || "Unknown"
            }`
          );
          console.log(`🧩 Elements: ${template.elements?.length || 0}`);

          if (template.elements && template.elements.length > 0) {
            console.log("\n🎯 Element details:");
            for (let i = 0; i < Math.min(3, template.elements.length); i++) {
              const elem = template.elements[i];
              console.log(
                `  ${i + 1}. Type: ${elem.type}, Position: (${
                  elem.position?.x
                }, ${elem.position?.y}), Size: ${elem.size?.width}x${
                  elem.size?.height
                }`
              );
              if (elem.content) {
                const preview =
                  elem.content.length > 50
                    ? elem.content.substring(0, 50) + "..."
                    : elem.content;
                console.log(`     Content: "${preview}"`);
              }
            }
            if (template.elements.length > 3) {
              console.log(
                `     ... and ${template.elements.length - 3} more elements`
              );
            }
          }
        }
      }
    }

    await sequelize.close();
    console.log("\n✅ Database examination complete");
  } catch (error) {
    console.error("❌ Database examination failed:", error.message);
    console.error("Stack trace:", error.stack);

    try {
      await sequelize.close();
    } catch (closeError) {
      console.error("Error closing database:", closeError.message);
    }
  }
}

examineOriginalTemplates();
