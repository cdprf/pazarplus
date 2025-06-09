const { User } = require("./server/models");
const path = require("path");

async function examineUserTemplates() {
  console.log("🔍 Examining user shipping templates...");

  try {
    // Find all users with shipping templates
    const users = await User.findAll({
      where: {
        settings: {
          [require("sequelize").Op.not]: null,
        },
      },
    });

    console.log(`📊 Found ${users.length} users in database`);

    let totalTemplates = 0;
    let emptyElementsCount = 0;
    let problematicTemplates = [];

    for (const user of users) {
      try {
        const settings = user.settings ? JSON.parse(user.settings) : {};
        const templates = settings.shippingTemplates || [];

        if (templates.length > 0) {
          console.log(
            `\n👤 User ID: ${user.id} has ${templates.length} template(s)`
          );
          console.log(`📧 Email: ${user.email}`);
          console.log(
            `⚙️ Default template ID: ${
              settings.defaultShippingTemplateId || "none"
            }`
          );

          totalTemplates += templates.length;

          templates.forEach((template, index) => {
            console.log(`\n  📋 Template ${index + 1}: ${template.name}`);
            console.log(`    ID: ${template.id}`);
            console.log(
              `    Description: ${template.description || "No description"}`
            );
            console.log(
              `    Elements count: ${
                template.elements ? template.elements.length : 0
              }`
            );
            console.log(`    Created: ${template.createdAt || "Unknown"}`);
            console.log(`    Updated: ${template.updatedAt || "Unknown"}`);

            // Check for problematic templates
            if (!template.elements || template.elements.length === 0) {
              emptyElementsCount++;
              problematicTemplates.push({
                userId: user.id,
                userEmail: user.email,
                templateId: template.id,
                templateName: template.name,
                issue: "No elements",
                isDefault: settings.defaultShippingTemplateId === template.id,
              });
              console.log(`    ⚠️ WARNING: Template has no elements!`);
            } else {
              // Examine elements for positioning issues
              template.elements.forEach((element, elIndex) => {
                console.log(
                  `      🧩 Element ${elIndex + 1}: ${
                    element.type || "Unknown type"
                  }`
                );
                console.log(
                  `        Position: x=${element.position?.x || 0}, y=${
                    element.position?.y || 0
                  }`
                );
                console.log(
                  `        Size: w=${element.size?.width || 0}, h=${
                    element.size?.height || 0
                  }`
                );
                console.log(
                  `        Content: ${
                    element.content
                      ? element.content.length > 50
                        ? element.content.substring(0, 50) + "..."
                        : element.content
                      : "No content"
                  }`
                );

                // Check for elements positioned outside typical PDF bounds
                const x = element.position?.x || 0;
                const y = element.position?.y || 0;
                const width = element.size?.width || 0;
                const height = element.size?.height || 0;

                // Assuming A4 page in mm: 210x297
                if (x > 210 || y > 297 || x + width > 210 || y + height > 297) {
                  problematicTemplates.push({
                    userId: user.id,
                    userEmail: user.email,
                    templateId: template.id,
                    templateName: template.name,
                    issue: `Element ${
                      elIndex + 1
                    } positioned outside page bounds`,
                    elementDetails: { type: element.type, x, y, width, height },
                    isDefault:
                      settings.defaultShippingTemplateId === template.id,
                  });
                  console.log(
                    `        ⚠️ WARNING: Element may be outside page bounds!`
                  );
                }

                // Check for transparent/invisible content
                if (
                  element.style?.color === "transparent" ||
                  element.style?.color === "#ffffff" ||
                  element.style?.opacity === 0
                ) {
                  problematicTemplates.push({
                    userId: user.id,
                    userEmail: user.email,
                    templateId: template.id,
                    templateName: template.name,
                    issue: `Element ${
                      elIndex + 1
                    } may be invisible (transparent/white color)`,
                    elementDetails: {
                      type: element.type,
                      style: element.style,
                    },
                    isDefault:
                      settings.defaultShippingTemplateId === template.id,
                  });
                  console.log(`        ⚠️ WARNING: Element may be invisible!`);
                }
              });
            }

            // Check template configuration
            if (template.config) {
              console.log(
                `    📐 Config: Paper=${
                  template.config.paperSize || "Default"
                }, Orientation=${template.config.orientation || "portrait"}`
              );
              console.log(
                `    📏 Margins: top=${
                  template.config.margins?.top || 10
                }, right=${template.config.margins?.right || 10}, bottom=${
                  template.config.margins?.bottom || 10
                }, left=${template.config.margins?.left || 10}`
              );
            } else {
              console.log(`    ⚠️ WARNING: No template configuration found!`);
              problematicTemplates.push({
                userId: user.id,
                userEmail: user.email,
                templateId: template.id,
                templateName: template.name,
                issue: "Missing template configuration",
                isDefault: settings.defaultShippingTemplateId === template.id,
              });
            }
          });
        }
      } catch (parseError) {
        console.error(
          `❌ Error parsing settings for user ${user.id}:`,
          parseError.message
        );
      }
    }

    console.log("\n📊 SUMMARY:");
    console.log(`├─ Total users: ${users.length}`);
    console.log(`├─ Total templates: ${totalTemplates}`);
    console.log(`├─ Templates with no elements: ${emptyElementsCount}`);
    console.log(
      `└─ Total problematic templates: ${problematicTemplates.length}`
    );

    if (problematicTemplates.length > 0) {
      console.log("\n🚨 PROBLEMATIC TEMPLATES:");
      problematicTemplates.forEach((problem, index) => {
        console.log(
          `\n${index + 1}. User: ${problem.userEmail} (ID: ${problem.userId})`
        );
        console.log(
          `   Template: "${problem.templateName}" (ID: ${problem.templateId})`
        );
        console.log(`   Issue: ${problem.issue}`);
        console.log(`   Is Default: ${problem.isDefault ? "YES ⚠️" : "No"}`);
        if (problem.elementDetails) {
          console.log(
            `   Element Details:`,
            JSON.stringify(problem.elementDetails, null, 4)
          );
        }
      });

      // Show most common issues
      const issueFrequency = {};
      problematicTemplates.forEach((p) => {
        const issueType = p.issue.includes("No elements")
          ? "No elements"
          : p.issue.includes("outside page bounds")
          ? "Outside page bounds"
          : p.issue.includes("invisible")
          ? "Invisible elements"
          : p.issue.includes("Missing template configuration")
          ? "Missing config"
          : "Other";
        issueFrequency[issueType] = (issueFrequency[issueType] || 0) + 1;
      });

      console.log("\n📈 ISSUE FREQUENCY:");
      Object.entries(issueFrequency)
        .sort(([, a], [, b]) => b - a)
        .forEach(([issue, count]) => {
          console.log(`   ${issue}: ${count} templates`);
        });
    }
  } catch (error) {
    console.error("❌ Error examining templates:", error);
  }
}

// Run the examination
examineUserTemplates()
  .then(() => {
    console.log("\n✅ Template examination completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
